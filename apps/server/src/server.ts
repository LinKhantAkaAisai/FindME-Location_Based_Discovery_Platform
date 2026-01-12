import app from './app.js';
import { pool } from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server screaming on http://localhost:${PORT}`);
  
  try {
    // This is the litmus test for your .env and Postgres setup
    const res = await pool.query('SELECT NOW()');
    console.log('✅ DB Connected! Current Time:', res.rows[0].now);
  } catch (err) {
    console.error('❌ DB Connection failed. Check your .env and psql status.');
    console.error(err);
  }
});