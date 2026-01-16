import { pool } from '../../config/db.js';
import type { CreateShopRequest } from './shops.types.js';

export const createShop = async (userId: number, data: CreateShopRequest) => {
  const { name, description, category, latitude, longitude, address } = data;

  const query = `
    INSERT INTO shops (owner_id, name, description, category, latitude, longitude, address)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [userId, name, description, category, latitude, longitude, address];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const getAllShops = async () => {
  const { rows } = await pool.query('SELECT * FROM shops ORDER BY created_at DESC');
  return rows;
};