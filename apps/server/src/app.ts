import express from 'express';
import cors from 'cors';
import shopRoutes from './features/shops/shops.routes.js';
import authRoutes from './features/auth/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'server is alive and kicking' });
});

app.get('/', (req, res) => {
  res.send('FindMe API is running...');
});




export default app;
