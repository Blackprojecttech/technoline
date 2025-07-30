import express from 'express';
import { eventController } from '../controllers/eventController';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Роут для подписки на события (требует авторизации)
router.get('/products', auth, admin, (req, res) => {
  console.log('👤 New SSE connection from user:', (req as any).user);
  eventController.subscribe(req, res);
});

export default router; 