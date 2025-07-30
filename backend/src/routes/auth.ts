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
  telegramAuth,
  checkAccess
} from '../controllers/authController';
import { auth, adminOnly, AuthRequest } from '../middleware/auth';
import { Router } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const router = express.Router();

// CORS middleware for auth routes
router.use(cors({
  origin: function (origin, callback) {
    console.log('🔐 Auth CORS request from origin:', origin);
    
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Allow all localtunnel domains
    if (origin.includes('.loca.lt')) {
      return callback(null, true);
    }
    
    // Allow all ngrok domains
    if (origin.includes('.ngrok.io') || origin.includes('.ngrok-free.app')) {
      return callback(null, true);
    }
    
    // Allow localhost and local network
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || 
        origin.match(/^https?:\/\/192\.168\.\d+\.\d+/) ||
        origin.match(/^https?:\/\/10\.\d+\.\d+\.\d+/) ||
        origin.match(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/)) {
      return callback(null, true);
    }
    
    // Allow specific production domains
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_URL || 'http://localhost:3200',
      'https://technoline.loca.lt',
      'https://technoline-admin.loca.lt',
      'https://technoline-api.loca.lt',
      'https://technohubstore.net',
      'https://admin.technohubstore.net'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('❌ Auth CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
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

// Эндпоинт для проверки прав доступа
router.get('/check-access', auth, checkAccess);

export default router; 