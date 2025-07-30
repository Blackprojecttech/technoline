import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Types } from 'mongoose';
import { RequestHandler } from 'express-serve-static-core';

// Define the user interface
export interface AuthUser {
  id: string;
  _id: string | Types.ObjectId;
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

// Extend the base Request interface
export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Проверяем токен в заголовке Authorization
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Если токена нет в заголовке, проверяем query параметры (для EventSource)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
    
    // Загружаем полные данные пользователя
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ User not found');
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Сохраняем данные пользователя
    (req as any).user = {
      id: (user._id as any).toString(),
      _id: user._id as any,
      role: user.get('role'),
      firstName: user.get('firstName'),
      lastName: user.get('lastName'),
      email: user.get('email'),
      phone: user.get('phone')
    };
    (req as any).token = token;

    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

export const adminOnly: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthRequest;
  if (!authReq.user || !authReq.user.role || !['admin', 'accountant'].includes(authReq.user.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  next();
};

// Вспомогательная функция для проверки ролей
const authorize = (...roles: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.user.role || !roles.includes(authReq.user.role)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    next();
  };
};

export const adminOrModerator = authorize('admin', 'moderator');
export const adminOrAccountant = authorize('admin', 'accountant'); 