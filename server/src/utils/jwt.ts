import jwt, { SignOptions } from 'jsonwebtoken';
import { DataScope, RoleCode } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './AppError';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  username: string;
  role: RoleCode;
  dataScope: DataScope;
  branchId: string;
  type: 'ACCESS';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'REFRESH';
}

export interface Temp2FATokenPayload {
  sub: string;
  email: string;
  purpose: '2FA_GMAIL_OTP';
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ ...payload, type: 'ACCESS' }, env.JWT_ACCESS_SECRET, options);
};

export const signRefreshToken = (userId: string, jti: string): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, jti, type: 'REFRESH' }, env.JWT_REFRESH_SECRET, options);
};

export const signTemp2FAToken = (userId: string, email: string): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_TEMP_2FA_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { sub: userId, email, purpose: '2FA_GMAIL_OTP' },
    env.JWT_TEMP_2FA_SECRET,
    options
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'ACCESS') {
      throw new AppError('Token không hợp lệ', 401, 'INVALID_ACCESS_TOKEN');
    }
    return decoded;
  } catch {
    throw new AppError('Access token không hợp lệ hoặc đã hết hạn', 401, 'UNAUTHORIZED');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'REFRESH') {
      throw new AppError('Refresh token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN');
    }
    return decoded;
  } catch {
    throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_REFRESH_TOKEN');
  }
};

export const verifyTemp2FAToken = (token: string): Temp2FATokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_TEMP_2FA_SECRET) as Temp2FATokenPayload;
    if (decoded.purpose !== '2FA_GMAIL_OTP') {
      throw new AppError('Phiên xác thực 2FA không hợp lệ', 401, 'INVALID_2FA_SESSION');
    }
    return decoded;
  } catch {
    throw new AppError(
      'Phiên xác thực 2FA đã hết hạn, vui lòng đăng nhập lại',
      401,
      'EXPIRED_2FA_SESSION'
    );
  }
};
