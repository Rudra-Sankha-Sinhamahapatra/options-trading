import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import prisma from '@options-trading/db';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token required",
        error: "MISSING_TOKEN"
      });
      return;
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: "Token has expired",
          error: "TOKEN_EXPIRED"
        });
        return;
      }
      
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        error: "INVALID_TOKEN"
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND"
      });
      return;
    }

    req.userId = user.id;
    req.user = {
      ...user,
      name: user.name ?? ''
    };
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: "Authentication error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
  }
};


export const optionalAuthMiddleware = async (
  req: AuthRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
        }
      });

      if (user) {
        req.userId = user.id;
        req.user = {
          ...user,
          name: user.name ?? ''
        };
      }
    } catch (jwtError) {
      console.log('Optional auth: Invalid token provided');
    }
    
    next();
  } catch (error: any) {
    console.error('Optional auth middleware error:', error);
    next(); 
  }
};