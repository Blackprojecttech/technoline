import { Request, Response, NextFunction } from 'express';

export const admin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore
    if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator' || req.user.role === 'accountant')) {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}; 