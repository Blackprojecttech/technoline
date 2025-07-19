import express from 'express';
import cors from 'cors';
import {
  register,
  login,
  getMe,
  updateProfile,
  getUsers,
  deleteUser,
  forgotPassword,
  resetPassword,
  googleAuth,
  yandexAuth,
  telegramAuth
} from '../controllers/authController';
import { auth, adminOnly } from '../middleware/auth';

const router = express.Router();

// CORS middleware for auth routes
router.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3100',
    'http://localhost:3200',
    'http://localhost:3201',
    'http://localhost:3202',
    'http://localhost:3203'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuth);
router.post('/yandex', yandexAuth);
router.post('/telegram', telegramAuth);

// Protected routes
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);

// Admin routes
router.get('/users', auth, adminOnly, getUsers);
router.delete('/users/:id', auth, adminOnly, deleteUser);

export default router; 