require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database: process.env.PSQL_DATABASE,
  password: process.env.PSQL_PASSWORD,
  port: process.env.PSQL_PORT,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  // 1) table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(6,2) NOT NULL,
      image_path TEXT,
      tags TEXT[] DEFAULT '{}',
      calories INT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // 2) clear + seed
  await pool.query(`TRUNCATE menu_items RESTART IDENTITY;`);

  const items = [
    ['Classic Milk Tea', 4.50, '/img/milk-tea.jpg',  ['tea','dairy'], 220, true],
    ['Taro Smoothie',   5.25, '/img/taro.jpg',       ['smoothie'],    300, true],
    ['Mango Green Tea', 4.75, '/img/mango.jpg',      ['tea','fruit'], 180, true],
    ['Thai Tea',        4.95, '/img/thai.jpg',       ['tea','dairy'], 260, true],
  ];

  for (const row of items) {
    await pool.query(
      `INSERT INTO menu_items (name, price, image_path, tags, calories, is_active)
       VALUES ($1,$2,$3,$4,$5,$6);`,
      row
    );
  }

  console.log(`Seeded menu_items with ${items.length} rows`);
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
