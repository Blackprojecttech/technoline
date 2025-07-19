import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 Auth middleware - URL:', req.url);
    console.log('🔐 Auth middleware - Token provided:', !!token);

    if (!token) {
      console.log('❌ No token provided');
      res.status(401).json({ message: 'Токен доступа не предоставлен' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    console.log('🔐 Auth middleware - Token decoded, user ID:', decoded.id);
    
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      res.status(401).json({ message: 'Пользователь не найден' });
      return;
    }

    if (!user.isActive) {
      console.log('❌ User account is not active:', user._id);
      res.status(401).json({ message: 'Аккаунт заблокирован' });
      return;
    }

    console.log('✅ Auth successful for user:', user._id, 'Role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth error:', error);
    res.status(401).json({ message: 'Недействительный токен' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Доступ запрещен' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Недостаточно прав для выполнения операции' });
      return;
    }

    next();
  };
};

export const adminOnly = authorize('admin');
export const adminOrModerator = authorize('admin', 'moderator'); 