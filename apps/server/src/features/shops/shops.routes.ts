import { Router } from 'express';
import { addShop, listShops } from './shops.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// Public: Anyone can see shops
router.get('/', listShops);

// Protected: Only logged-in users can create shops
router.post('/', authenticate, addShop);

export default router;