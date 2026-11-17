import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'trường dữ liệu';
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_RECORD',
        message: `Dữ liệu bị trùng lặp tại: ${target}`,
        timestamp: new Date().toISOString(),
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        code: 'RECORD_NOT_FOUND',
        message: 'Bản ghi cần thao tác không tồn tại',
        timestamp: new Date().toISOString(),
      });
    }
  }

  console.error('❌ [Unhandled Error]:', err);

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Lỗi hệ thống nội bộ, vui lòng thử lại sau',
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { debug: err.message, stack: err.stack }
      : {}),
    timestamp: new Date().toISOString(),
  });
};
