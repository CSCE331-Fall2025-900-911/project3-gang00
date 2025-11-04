// index.js
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

// ---- App Setup ----
const app = express();
const port = process.env.PORT || 3000;

// Views (EJS) + Static assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));       // ensure EJS looks in /views
app.use(express.static(path.join(__dirname, 'public'))); // serve /public (images/css/js)
app.use(express.json()); // makes sure that express can read json sent over https requests
app.use(express.urlencoded({ extended: false })); // parses x-www-form-urlencoded

// ---- Database Pool ----
const pool = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database: process.env.PSQL_DATABASE,
  password: process.env.PSQL_PASSWORD,
  port: process.env.PSQL_PORT,
  ssl: { rejectUnauthorized: false }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await pool.end();
  } catch (e) {
    // ignore
  }
  console.log('Application successfully shutdown');
  process.exit(0);
});

// Setting up session logging with Passport (For signing in/out)
// Session setup
app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: true
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialize/deserialize
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user)); 

// Configure Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/customer-sign-in/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  // Here’s where you would check if the user exists in your DB
  // If not, create them.
  // profile contains Google info like email, name, picture, etc.
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const name = profile.displayName;

    // check if customer with google id already exists
    let result = await pool.query('SELECT * FROM customers WHERE google_id = $1', [googleId]);
    let user;

    if (result.rows.length > 0) {
      // Google account is already linked in db
      user = result.rows[0];
    } else {
      // check if a local account has already been set up with this email
      const existingUser = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

      if (existingUser.rows.length > 0) {
        // we already have a local account, so add the new link to google
        const updatedUser = await pool.query(
          `UPDATE customers
          SET google_id = $1
          WHERE email = $2
          RETURNING *;`,
          [googleId, email]
        );

        user = updatedUser.rows[0];
      } else {
        // no local account and no google link
        const newUser = await pool.query(
          `INSERT INTO customers (customer_name, email, google_id, points)
          VALUES ($1, $2, $3, $4)
          RETURNING *;`,
          [name, email, googleId, 0]
        );
        user = newUser.rows[0]
      }
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' }, 
  async (email, password, done) => {
    // get hashedpassword from database
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        // no user found
        return done(null, false, { message: "User not found" });
      }

      const user = result.rows[0];

      // check if only have google account linked
      if (!user.password_hash) {
        return done(null, false, { message: "Sign in with Google or visit the Sign Up page to link this email to a local account"});
      }

      const hashedPassword = result.rows[0].password_hash;
      const match = await bcrypt.compare(password, hashedPassword);

      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      }
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));


// ---- Routes ----

// Redirect home to /menu so you see the menu immediately
app.get('/', (req, res) => {
  // TODO - Might change later
  if (req.isAuthenticated()) {
    console.log("Logged in as user: " + req.user.customer_name);
  }
  res.render('index');
});

// Employee sign in
app.get('/employee-sign-in', (req, res) => {
  res.render('employeeSignIn');
});

// General Sign in
app.get('/general-sign-in', (req, res) => {
  res.render('generalSignIn');
});

// Customer Sign in
app.get('/customer-sign-in', (req, res) => {
  res.render('customerSignIn');
});

// This will need to be protected in the future
app.get('/employee-sign-up', (req, res) => {
  res.render('employeeSignUp');
});

// This will need to be protected in the future
app.get('/customer-sign-up', (req, res) => {
  res.render('customerSignUp');
});

app.get('/employee', (req, res) => {
  res.render('employee');
})

// Help
app.get('/help', (req, res) => {
    //site object for supportcontact
    const site = {
    brand: 'Sharetea',
    supportEmail: 'support@sharetea.mcgowan',
    supportPhone: '(555) 123-4567',
    supportHours: 'Daily 10 AM - 8 PM'
  };

    //list of faq questions to render
    const faqs = [
    { q: 'How do I place an order?',
      a: 'Go to the Order page, pick items, customize, and checkout.' },
    { q: 'Do you offer delivery?',
      a: 'Yes. Delivery availability depends on your location and local partners.' },
    { q: 'Can I customize my drink?',
      a: 'Absolutely—choose sweetness, ice level, size, and toppings during checkout.' },
    { q: 'Are allergen details available?',
      a: 'Common allergens are listed on each product page; cross-contact may occur.' }
  ];

    res.render('help', {faqs, site});
});

// ---- Sign in and sign up functions ---- //
app.post('/employee-sign-in/attempt', async (req, res) => {
  const { username, password } = req.body;

  // get hashedpassword from database
  try {
    const result = await pool.query('SELECT (password_hash) FROM employees WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      // no user found
      return res.json({ success: false, message: "User not found" });
    }

    const hashedPassword = result.rows[0].password_hash;
    const match = await bcrypt.compare(password, hashedPassword);

    if (!match) {
      return res.json({ success: false, message: "Incorrect password" });
    }
    
    res.json({ success: true, user: username});
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error"});
  }
});

app.post('/employee-sign-up/attempt', async (req, res) => {
  const { fullname, role, username, password } = req.body;

  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO employees
      (employee_name, role, username, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING *;`,
      [fullname, role, username, hashedPassword]
    );
    
    console.log("Inserted employee:", result.rows[0]);
    res.json({ success: true});
  } catch (err) {
    console.error('DB error:', err);

    if (err.code === '23505') { // unique violation in Postgres
      return res.json({ success: false, message: "Username already exists" });
    }

    res.json({ success: false, message: "Server error: " + err});
  }
});

app.post('/customer-sign-in/attempt', (req, res) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    if (!user) {
      // Authentication failed
      return res.status(401).json({ success: false, message: info.message });
    }
    // Log in the user (establish session)
    req.logIn(user, err => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Login failed' });
      }
      return res.json({ success: true, user });
    });
  })(req, res);
});


app.post('/customer-sign-up/attempt', async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      // email already exits in data base
      if (result.rows[0].password_hash !== null) {
        // already have local account
        return res.json({ success: false, message: "Account already exists for this email address!"});
      } else {
        // have no local, but a google linked account
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
          `UPDATE customers
          SET password_hash = $1
          WHERE email = $2;`,
          [hashedPassword, email]
        );

        return res.json({ success: true, message: "Account now has local login capabilities!"});
      }
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      `INSERT INTO customers
      (customer_name, email, password_hash)
      VALUES ($1, $2, $3);`,
      [fullname, email, hashedPassword]
    );
    
    console.log("Inserted customer:", result.rows[0]);
    res.json({ success: true});
  } catch (err) {
    res.json({ success: false, message: "Server error: " + err});
  }
});

// Attempt Google authentication
app.get('/google/auth',
  passport.authenticate("google", { scope: ["profile", "email"]})
);

// Google callback url
app.get('/customer-sign-in/google/callback',
  passport.authenticate("google", { failureRedirect: "/" }), (req, res) => {
    // Successful login
    res.redirect("/");
});

// Contact
app.get('/contact', (req, res) => {

    //site object for supportcontact
    const site = {
      brand: 'Sharetea',
      supportEmail: 'support@sharetea.mcgowan',
      supportPhone: '(555) 123-4567',
      supportHours: 'Daily 10 AM - 8 PM',
      address: 'Zachry Engineering Center125 Spence St, College Station, TX 77840'
    };
    res.render('contact', {site});
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

// ---- Menu (sample items) ----
app.get('/menu', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM products;'
    );
    const items = rows.map(r => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_price: Number(r.product_price),
      category_id: r.category_id,
    }));

    res.render('menu', { items });
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

// Enable translate functon
// ---- Translation API (backend) ----
const TRANSLATE_ENABLED = (process.env.TRANSLATE_ENABLED || 'false') === 'true';
const PROJECT_ID = process.env.PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'global';

const translateClient = new translateV3.TranslationServiceClient(); // connect the translate server
const PARENT = `projects/${PROJECT_ID}/locations/${GCP_LOCATION}`;

// TODO: HAO, next step is to get the data from frontend translate.js, and use API to translate these text, and then send them back
// Need cache to reduce the space and the speed
// A simple cache
const translateCache = new Map();
function cacheKey(text, source, target, mime) {
    // target language, source language, the type of text, the content of text
    return `${target}|${source || ''}|${mime || 'text/plain'}|${text}`; 
}

app.post('/api/translate', async (req, res) => {
    if (!TRANSLATE_ENABLED) 
        return res.status(503).json({ error: 'translation disabled' });

    const { texts, target, source, mimeType } = req.body || {};
    if (!Array.isArray(texts) || texts.length === 0 || !target) {
      return res.status(400).json({ error: 'texts(array)/target required' });
    }

    // hit cache & deduplicating
    const results = new Array(texts.length);
    const toQuery = [];
    const idxMap = [];
    for (let i = 0; i < texts.length; i++) {
      const t = (texts[i] || '').trim();
      const key = cacheKey(t, source, target, mimeType);
      if (translateCache.has(key)) {
        results[i] = translateCache.get(key);
      } else {
        toQuery.push(t); // there is no any result for this stuff that is needed to translate, push and query
        idxMap.push(i); // record the index of this element
      }
    }

    try {
        if (toQuery.length > 0) {
            const req = {
              parent: PARENT,
              contents: toQuery,
              targetLanguageCode: target,
              mimeType: mimeType || 'text/plain',
            };
            
            if (source) {
              req.sourceLanguageCode = source;
            }
            
            const [resp] = await translateClient.translateText(req); // call translate API, and get the first element of the return array which is [all translated content]

            const translated = (resp.translations || []).map(t => t.translatedText || ''); // map function will travesal all element of the array, and excute the function which is its param
            translated.forEach((val, k) => {
                const i = idxMap[k]; // find the corresponding index of the idxmap, and then we can put the translated content to the right places
                results[i] = val;
                const key = cacheKey(texts[i], source, target, mimeType);
                translateCache.set(key, val);
            });

            // control the cache size
            if (translateCache.size > 2000) {
                translateCache.delete(translateCache.keys().next().value);
            }
        }

        res.json({ results });
    } catch (e) {
        console.error('translate error:', e);
        res.status(500).json({ error: 'translate failed' });
    }
});

// ---- Start Server ----
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
