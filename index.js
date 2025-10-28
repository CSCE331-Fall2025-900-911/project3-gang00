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
  res.render('help');
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

// ---- Start Server ----
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
