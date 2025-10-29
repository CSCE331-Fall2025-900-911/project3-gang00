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

// Manager sign in
app.get('/manager-sign-in', (req, res) => {
  res.render('managerSignIn');
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
app.get('/menu', (req, res) => {
  const items = [
    { id: 1, name: 'Classic Milk Tea', price: 4.50, img: '/img/milk-tea.jpg', tags: ['tea', 'dairy'], calories: 220 },
    { id: 2, name: 'Taro Smoothie',   price: 5.25, img: '/img/taro.jpg',      tags: ['smoothie'],     calories: 300 },
    { id: 3, name: 'Mango Green Tea', price: 4.75, img: '/img/mango.jpg',     tags: ['tea', 'fruit'], calories: 180 },
    { id: 4, name: 'Thai Tea',        price: 4.95, img: '/img/thai.jpg',      tags: ['tea', 'dairy'], calories: 260 }
  ];
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
