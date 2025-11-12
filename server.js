// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcrypt');
const { v3: translateV3 } = require('@google-cloud/translate');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const { get } = require('https');
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
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// -------- Google OAuth --------
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/customer-sign-in/google/callback',
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

// -------- Local strategies --------
// Customer local
passport.use('customer-local', new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
      if (result.rows.length === 0) return done(null, false, { message: 'User not found' });

      const user = result.rows[0];
      if (!user.password_hash)
        return done(null, false, { message: 'Sign in with Google or link your email first' });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return done(null, false, { message: 'Incorrect password' });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Employee local
passport.use('employee-local', new LocalStrategy(
  { usernameField: 'username', passwordField: 'password' },
  async (username, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM employees WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return done(null, false, { message: 'User not found' });
      }
      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return done(null, false, { message: 'Incorrect password' });
      done(null, user);
    } catch (err) {
      done(err, false, { message: 'Server error' });
    }
  }
));

// ---------------- ROUTES ----------------

// Home
app.get('/', (req, res) => {
  if (req.isAuthenticated() && (req.user.customer_id !== undefined)) {
    return res.render('index', { user: req.user });
  }
  res.render('index', { user: null });
});

// Sign-in/Sign-up pages
app.get('/employee-sign-in', (req, res) => res.render('employeeSignIn'));
app.get('/general-sign-in', (req, res) => res.render('generalSignIn'));
app.get('/customer-sign-in', (req, res) => res.render('customerSignIn'));
app.get('/employee-sign-up', (req, res) => res.render('employeeSignUp'));
app.get('/customer-sign-up', (req, res) => res.render('customerSignUp'));

// Employee portal (guarded)
app.get('/employee', (req, res) => {
  if (!req.isAuthenticated()) {
        // User is not logged in at all
        return res.redirect('/employee-sign-in');
    }
    if (req.user.employee_id === undefined) {
        // User is logged in but not an employee
        return res.redirect('/');
    }
    // User is authenticated and is an employee
    res.render('employee', { user: req.user });
});

// Check manager credentials
app.get('/manager/check-credentials', (req, res) => {
  if (!req.isAuthenticated()) {
    // User not logged in at all
    return res.json({success: false, message: "You are not signed in!"});
  }
  if (req.user.employee_id === undefined) {
    // logged in but not as an employee
    return res.json({success: false, message: "You are not signed in as an employee!"});
  }
  if (req.user.role !== 'Manager') {
    return res.json({success: false, message: "Your account does not have manager permissions!"});
  }
  res.json({success: true});
})

// Manager portal (guarded)
app.get('/manager', (req, res) => {
  if (!req.isAuthenticated()) {
    // User not logged in at all
    return res.redirect('/employee-sign-in');
  }
  if (req.user.employee_id === undefined) {
    // logged in but not as an employee
    return res.redirect('/');
  }
  if (req.user.role !== 'Manager') {
    return res.json({success: false, message: "Your account does not have manager permissions!"});
  }
  res.render('manager', { user: req.user });
})

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
  
  if (req.isAuthenticated() && req.user.customer_id !== undefined) {
    return res.render('help', { faqs: faqs, site: site, user: req.user });
  }
  res.render('help', { faqs: faqs, site: site, user: null });
});

// Employee sign in attempt (passport)
app.post('/employee-sign-in/attempt', (req, res) => {
  passport.authenticate('employee-local', (err, user, info) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (!user) return res.status(401).json({ success: false, message: info.message });
    req.logIn(user, err2 => {
      if (err2) return res.status(500).json({ success: false, message: 'Login failed' });
      return res.json({ success: true, user });
    });
  })(req, res);
});

// Employee logout
app.get('/employee/logout', (req, res) => {
  req.logout(err => {
    if (err) { return res.json({ success: false, message: 'Logout Failed' }); }
    req.session.destroy(err2 => {
      if (err2) { console.error(err2); }
      res.redirect('/');
    });
  });
});

// Employee sign up attempt
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

    console.log('Inserted employee:', result.rows[0]);
    res.json({ success: true });
  } catch (err) {
    console.error('DB error:', err);
    if (err.code === '23505') {
      return res.json({ success: false, message: 'Username already exists' });
    }
    res.json({ success: false, message: 'Server error: ' + err });
  }
});

// Customer sign in attempt (local)
app.post('/customer-sign-in/attempt', (req, res) => {
  passport.authenticate('customer-local', (err, user, info) => {
    if (err) return res.status(500).json({ success: false, message: 'Server error' });
    if (!user) return res.status(401).json({ success: false, message: info.message });
    req.logIn(user, err2 => {
      if (err2) return res.status(500).json({ success: false, message: 'Login failed' });
      return res.json({ success: true, user });
    });
  })(req, res);
});

// Customer sign up attempt
app.post('/customer-sign-up/attempt', async (req, res) => {
  const { fullname, email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      // Email exists
      if (result.rows[0].password_hash !== null) {
        // Already has local account
        return res.json({ success: false, message: 'Account already exists for this email address!' });
      } else {
        // Google-linked only → add local password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const updateResult = await pool.query(
          `UPDATE customers
           SET password_hash = $1
           WHERE email = $2
           RETURNING *;`,
          [hashedPassword, email]
        );

        req.logIn(updateResult.rows[0], err => {
          if (err) return res.status(500).json({ success: false, message: 'Login failed' });
          return res.json({ success: true, message: 'Account now has local login capabilities!' });
        });
        return; // important: stop here
      }
    }

    // Fresh insert
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertResult = await pool.query(
      `INSERT INTO customers
       (customer_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [fullname, email, hashedPassword]
    );

    req.logIn(insertResult.rows[0], err => {
      if (err) return res.status(500).json({ success: false, message: 'Login failed' });
      res.json({ success: true, user: req.user });
    });
  } catch (err) {
    res.json({ success: false, message: 'Server error: ' + err });
  }
});

// Customer logout
app.get('/customer/logout', (req, res) => {
  req.logout(err => {
    if (err) { return res.json({ success: false, message: 'Logout Failed' }); }
    req.session.destroy(err2 => {
      if (err2) { console.error(err2); }
      res.redirect('/');
    });
  });
});

// Google OAuth endpoints
app.get('/google/auth', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/customer-sign-in/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

// View Profile
app.get('/profile', (req, res) => {
  if (req.isAuthenticated() && req.user.customer_id !== undefined) {
    return res.render('profile', {user: req.user});
  }
  res.redirect('/');
})

// Contact
app.get('/contact', (req, res) => {
  const site = {
    brand: 'Sharetea',
    supportEmail: 'support@sharetea.mcgowan',
    supportPhone: '(555) 123-4567',
    supportHours: 'Daily 10 AM - 8 PM',
    address: 'Zachry Engineering Center, 125 Spence St, College Station, TX 77840',
  };
  if (req.isAuthenticated() && (req.user.customer_id !== undefined)) {
    return res.render('contact', { site: site, user: req.user });
  }
  res.render('contact', { site: site, user: null });
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
  let user;
  if (req.isAuthenticated() && req.user.customer_id !== undefined) {
    user = req.user;
  } else {
    user = null;
  }

  try {
    const { rows } = await pool.query('SELECT * FROM products;');

    const items = rows.map(r => {
      const name = (r.product_name || '').toLowerCase();

      // choose a local image based on keywords; defaults to milk-tea
      let imageFile = 'milk-tea.jpg';
      if (name.includes('thai')) imageFile = 'thai.jpg';
      else if (name.includes('taro')) imageFile = 'taro.jpg';
      else if (name.includes('mango')) imageFile = 'mango.jpg';

      return {
        id: r.product_id,
        name: r.product_name,
        price: Number(r.product_price),
        tags: r.category_id,          // placeholder; change later if you add real tags
        img_url: `/img/${imageFile}`, // CORRECT path; served from /public/img
      };
    });

    if (req.isAuthenticated() && (req.user.customer_id !== undefined)) {
      return res.render('menu', { items: items, user: req.user });
    }
    res.render('menu', { items: items, user: null });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Database query failed');
  }
});

// Order page
app.get('/order', async (req, res) => {
  try {
    const categoriesQuery = 'SELECT category_id, category_name FROM categories;';
    const { rows: categories } = await pool.query(categoriesQuery);

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

    const addonsQuery = `
      SELECT 
        addon_id AS id,
        addon_name AS name,
        addon_price AS price
      FROM addons
      WHERE is_available = true;
    `;
    const addons = (await pool.query(addonsQuery)).rows.map(a => ({
      ...a,
      price: parseFloat(a.price),
    }));

    const groupedProducts = categories.map(category => ({
      category: category.category_name,
      categoryId: category.category_id,
      products: products.filter(p => p.category_id === category.category_id),
    }));

    const selectedCategory = req.query.category || null;

    if (req.isAuthenticated() && req.user.customer_id !== undefined) {
      return res.render('order', { groupedProducts: groupedProducts, selectedCategory: selectedCategory, addons: addons, user: req.user });
    }
    res.render('order', { groupedProducts: groupedProducts, selectedCategory: selectedCategory, addons: addons, user: null });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).send('Database query failed');
  }
});

// -------- Translation setup (unused but harmless) --------
const TRANSLATE_ENABLED = (process.env.TRANSLATE_ENABLED || 'false') === 'true';
const PROJECT_ID = process.env.PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || 'global';
const translateClient = new translateV3.TranslationServiceClient(); // connect the translate server
const PARENT = `projects/${PROJECT_ID}/locations/${GCP_LOCATION}`;

// A simple cache for translation
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

// ---------- Weather helper (Node 18+ has fetch; fallback if needed) ----------
async function fetchCompat(url, options) {
  if (typeof fetch !== 'undefined') return fetch(url, options);
  const mod = await import('node-fetch');
  return mod.default(url, options);
}

// Weather drink recommender route
app.get('/api/kiosk-info', async (req, res) => {
  try {
    //College Station
    const lat = 30.62798;   
    const lon = -96.33441;

    if (!WEATHER_API_KEY) {
      return res.json({
        ok: true,
        weather: null,
        recommendation: "Thai Pearl Milk Tea",
        note: "Missing WEATHER_API_KEY; showing fallback."
      });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    const r = await fetchCompat(url);
    const data = await r.json();

    const tempC = data?.main?.temp ?? null;
    const condition = (data?.weather?.[0]?.main || '').toLowerCase();
    const icon = data?.weather?.[0]?.icon || null;
    const city = data?.name || 'Local';

    function pickDrink(t, cond) {
      if (t == null) return "Thai Pearl Milk Tea";
      if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('thunder')) {
        return "Coffee Milk Tea w/ Coffee Jelly";
      }
      if (t >= 30) return "Berry Lychee Burst (extra ice)";
      if (t >= 24) return "Taro Pearl Milk Tea (50% sugar)";
      if (t >= 17) return "Classic Pearl Milk Tea";
      return "Peppermint Tea";
    }

    res.json({
      ok: true,
      city,
      tempC,
      condition,
      icon,
      recommendation: pickDrink(tempC, condition)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'weather fetch failed' });
  }
});


// ---- Start Server ----
app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
