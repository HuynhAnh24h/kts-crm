import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta | Record<string, unknown>
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  });
};
