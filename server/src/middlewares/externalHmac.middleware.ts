import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { verifyHmacSha256 } from '../utils/crypto';

/**
 * Bảo mật cổng API External (/api/v1/external/*) theo đúng Node 11 trên sơ đồ mạng:
 * - Chỉ mở cho Phần mềm Chấm công Cloud & Phần mềm Tính lương Riêng
 * - Kiểm tra IP Whitelist + X-API-Key + Chữ ký HMAC-SHA256 (X-Signature)
 */
export const verifyExternalGatewayAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const clientIp =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '';

  const whitelist = env.EXTERNAL_IP_WHITELIST.split(',').map((ip) => ip.trim());
  const isLocalhost =
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp.endsWith('127.0.0.1');

  const isWhitelisted =
    isLocalhost ||
    whitelist.includes('*') ||
    whitelist.some((allowed) => clientIp.includes(allowed.replace('/24', '')));

  if (!isWhitelisted) {
    throw new AppError(
      `IP ${clientIp} không nằm trong danh sách Whitelist của Cloudflare API Gateway`,
      403,
      'EXTERNAL_IP_NOT_WHITELISTED'
    );
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  const signature = req.headers['x-signature'] as string | undefined;

  if (!apiKey || apiKey !== env.EXTERNAL_API_KEY) {
    throw new AppError('X-API-Key không hợp lệ', 401, 'INVALID_EXTERNAL_API_KEY');
  }

  if (!signature) {
    throw new AppError('Thiếu chữ ký xác thực HMAC-SHA256 (X-Signature)', 401, 'MISSING_HMAC_SIGNATURE');
  }

  const payloadString =
    req.method === 'GET'
      ? req.originalUrl
      : JSON.stringify(req.body ?? {});

  const isValidHmac = verifyHmacSha256(payloadString, env.EXTERNAL_HMAC_SECRET, signature);
  if (!isValidHmac) {
    throw new AppError('Chữ ký HMAC-SHA256 không khớp với dữ liệu gửi lên', 401, 'INVALID_HMAC_SIGNATURE');
  }

  next();
};
