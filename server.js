// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const bcrypt = require("bcrypt");
const { v3: translateV3 } = require('@google-cloud/translate');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const LocalStrategy = require('passport-local').Strategy;

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// ---- App Setup ----
const app = express();
const port = process.env.PORT || 3000;

// -------- View engine + static assets --------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// -------- Database --------
const pool = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database: process.env.PSQL_DATABASE,
  password: process.env.PSQL_PASSWORD,
  port: process.env.PSQL_PORT,
  ssl: { rejectUnauthorized: false },
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try { await pool.end(); } catch (e) {}
  console.log('Application successfully shutdown');
  process.exit(0);
});

// -------- Session + Passport --------
app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// -------- Google OAuth --------
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,            
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,    
  callbackURL: "/customer-sign-in/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const name = profile.displayName;

    let result = await pool.query('SELECT * FROM customers WHERE google_id = $1', [googleId]);
    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      const existingUser = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        const updatedUser = await pool.query(
          `UPDATE customers SET google_id = $1 WHERE email = $2 RETURNING *;`,
          [googleId, email]
        );
        user = updatedUser.rows[0];
      } else {
        const newUser = await pool.query(
          `INSERT INTO customers (customer_name, email, google_id, points)
           VALUES ($1, $2, $3, $4)
           RETURNING *;`,
          [name, email, googleId, 0]
        );
        user = newUser.rows[0];
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// -------- Local login strategy --------
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      if (result.rows.length === 0) return done(null, false, { message: "User not found" });

      const user = result.rows[0];
      if (!user.password_hash)
        return done(null, false, { message: "Sign in with Google or link your email first" });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return done(null, false, { message: "Incorrect password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

//ROUTES 

// Home
app.get('/', (req, res) => {
  if (req.isAuthenticated()) console.log("Logged in as:", req.user.customer_name);
  res.render('index');
});

// Sign-in/Sign-up pages
app.get('/employee-sign-in', (req, res) => res.render('employeeSignIn'));
app.get('/general-sign-in', (req, res) => res.render('generalSignIn'));
app.get('/customer-sign-in', (req, res) => res.render('customerSignIn'));
app.get('/employee-sign-up', (req, res) => res.render('employeeSignUp'));
app.get('/customer-sign-up', (req, res) => res.render('customerSignUp'));
app.get('/employee', (req, res) => res.render('employee'));

// Help
app.get('/help', (req, res) => {
  const site = {
    brand: 'Sharetea',
    supportEmail: 'support@sharetea.mcgowan',
    supportPhone: '(555) 123-4567',
    supportHours: 'Daily 10 AM - 8 PM',
  };
  const faqs = [
    { q: 'How do I place an order?', a: 'Go to the Order page, pick items, customize, and checkout.' },
    { q: 'Do you offer delivery?', a: 'Yes, depending on your location.' },
    { q: 'Can I customize my drink?', a: 'Yes—choose sweetness, ice, and toppings.' },
    { q: 'Are allergen details available?', a: 'Allergen info is listed on each product page.' },
  ];
  res.render('help', { faqs, site });
});

// Employee sign in attempt
app.post('/employee-sign-in/attempt', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT (password_hash) FROM employees WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) return res.json({ success: false, message: "Incorrect password" });

    res.json({ success: true, user: username });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
});

// Customer sign in attempt (local)
app.post('/customer-sign-in/attempt', (req, res) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (!user) return res.status(401).json({ success: false, message: info.message });
    req.logIn(user, err => {
      if (err) return res.status(500).json({ success: false, message: 'Login failed' });
      return res.json({ success: true, user });
    });
  })(req, res);
});

// Customer sign up attempt
app.post('/customer-sign-up/attempt', async (req, res) => {
  const { fullname, email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

    if (result.rows.length > 0 && result.rows[0].password_hash)
      return res.json({ success: false, message: "Account already exists" });

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    if (result.rows.length > 0) {
      await pool.query('UPDATE customers SET password_hash = $1 WHERE email = $2;', [hashedPassword, email]);
      return res.json({ success: true, message: "Account linked successfully" });
    }

    await pool.query(
      `INSERT INTO customers (customer_name, email, password_hash)
       VALUES ($1, $2, $3);`,
      [fullname, email, hashedPassword]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: "Server error: " + err });
  }
});

// Google OAuth endpoints
app.get('/google/auth', passport.authenticate("google", { scope: ["profile", "email"] }));
app.get('/customer-sign-in/google/callback',
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

// Contact
app.get('/contact', (req, res) => {
  const site = {
    brand: 'Sharetea',
    supportEmail: 'support@sharetea.mcgowan',
    supportPhone: '(555) 123-4567',
    supportHours: 'Daily 10 AM - 8 PM',
    address: 'Zachry Engineering Center, 125 Spence St, College Station, TX 77840'
  };
  res.render('contact', { site });
});

// Example DB page
app.get('/user', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees;');
    res.render('user', { teammembers: rows });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Database query failed');
  }
});

// -------- Menu Route (DB-backed) --------
app.get('/menu', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM products;'
    );
    const items = rows.map(r => ({
      id: r.product_id,
      name: r.product_name,
      price: Number(r.product_price),
      tags: r.category_id,
      img_url: "./public/img/mango.jpg"
    }));

    res.render('menu', { items });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Database query failed');
  }
});

app.get('/order', async (req, res) => {
    try {
        // Fetch all categories
        const categoriesQuery = 'SELECT category_id, category_name FROM categories;';
        const { rows: categories } = await pool.query(categoriesQuery);

        // Fetch products grouped by category
        const productsQuery = `
            SELECT 
                products.product_name AS name, 
                products.product_price AS price, 
                products.category_id, 
                categories.category_name AS category
            FROM products
            JOIN categories ON products.category_id = categories.category_id
            ORDER BY categories.category_id;
        `;
        const { rows: products } = await pool.query(productsQuery);

        // Fetch addons
        const addonsQuery = `
            SELECT 
                addon_id AS id,
                addon_name AS name,
                addon_price AS price
            FROM addons
            WHERE is_available = true;
        `;
        const addons = (await pool.query(addonsQuery)).rows.map(addon => ({
            ...addon,
            price: parseFloat(addon.price),
        }));
        
        // Group products by category
        const groupedProducts = categories.map(category => {
            return {
                category: category.category_name,
                categoryId: category.category_id,
                products: products.filter(product => product.category_id === category.category_id)
            };
        });

        const selectedCategory = req.query.category;

        // Render the order page with categories, grouped products, and addons
        res.render('order', { groupedProducts, selectedCategory, addons });
    } catch (err) {
        console.error('DB error:', err);
        res.status(500).send('Database query failed');
    }
});

app.get('/user', (req, res) => {
    teammembers = []
    pool
        .query('SELECT * FROM employees;')
        .then(query_res => {
            for (let i = 0; i < query_res.rowCount; i++){
                teammembers.push(query_res.rows[i]);
            }
            const data = {teammembers: teammembers};
            console.log(teammembers);
            res.render('user', data);
        });
});

// -------- Translation setup (unused but harmless) --------
const TRANSLATE_ENABLED = (process.env.TRANSLATE_ENABLED || 'false') === 'true';
const PROJECT_ID = process.env.PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'global';
const translateClient = new translateV3.TranslationServiceClient();
const PARENT = `projects/${PROJECT_ID}/locations/${GCP_LOCATION}`;

// TODO: HAO, next step is to get the data from frontend translate.js, and use API to translate these text, and then send them back
// Need cache to reduce the space and the speed

// Async function that calls weather api
async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Current weather:", data);
    return data;
  } catch (error) {
    console.error("Error fetching weather:", error);
  }
}

//test getWeather function
getWeather(30.62798, -96.33441); 


// ---- Start Server ----
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
