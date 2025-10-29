// index.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// ---- App Setup ----
const app = express();
const port = process.env.PORT || 3000;

// Views (EJS) + Static assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));       // ensure EJS looks in /views
app.use(express.static(path.join(__dirname, 'public'))); // serve /public (images/css/js)

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

// ---- Routes ----

// Redirect home to /menu so you see the menu immediately
app.get('/', (req, res) => {
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

// ---- Start Server ----
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
