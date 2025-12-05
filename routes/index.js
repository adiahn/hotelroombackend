import express from 'express';
import authRoutes from './auth.js';
import roomRoutes from './rooms.js';
import agentRoutes from './agents.js';
import guestRoutes from './guests.js';

export const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/agents', agentRoutes);
router.use('/guests', guestRoutes);

