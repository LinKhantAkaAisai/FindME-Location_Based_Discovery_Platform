import type { Request, Response } from 'express';
import { createShop, getAllShops } from './shops.service.js';

export const addShop = async (req: Request, res: Response) => {
  try {
    // req.user comes from our authenticate middleware
    const userId = req.user!.userId; 
    const shop = await createShop(userId, req.body);
    
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shop' });
  }
};

export const listShops = async (_req: Request, res: Response) => {
  try {
    const shops = await getAllShops();
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
};