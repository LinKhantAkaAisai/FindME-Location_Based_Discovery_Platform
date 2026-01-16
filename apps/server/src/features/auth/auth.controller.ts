import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../config/db.js';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id, email',
      [email, hashed]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    console.error("DEBUG AUTH ERROR:", e);
    res.status(500).json({ error: e.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { userId: user.user_id }, 
        process.env.JWT_SECRET as string, 
        { expiresIn: '1d' }
      );
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e: any) {
    console.error("LOGIN ERROR:", e);
    res.status(500).json({ error: e.message });
  }
};