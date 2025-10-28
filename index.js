const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv').config();
const path = require('path');

// Create express app
const app = express();
const port = 3000;

// Create pool
const pool = new Pool({
    user: process.env.PSQL_USER,
    host: process.env.PSQL_HOST,
    database: process.env.PSQL_DATABASE,
    password: process.env.PSQL_PASSWORD,
    port: process.env.PSQL_PORT,
    ssl: {rejectUnauthorized: false}
});

// Add process hook to shutdown pool
process.on('SIGINT', function() {
    pool.end();
    console.log('Application successfully shutdown');
    process.exit(0);
});

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));
	 	 	 	
app.set("view engine", "ejs");

app.get('/', (req, res) => {
    const data = {name: 'Mario'};
    res.render('index', data);
});

app.get('/employee-sign-in', (req, res) => {
    res.render('employeeSignIn');
});

app.get('/manager-sign-in', (req, res) => {
    res.render('managerSignIn');
});

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

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

