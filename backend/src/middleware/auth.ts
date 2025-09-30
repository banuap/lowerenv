import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { UserModel } from '../models/user';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { id: string };
    const user = await UserModel.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    req.user = user;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};