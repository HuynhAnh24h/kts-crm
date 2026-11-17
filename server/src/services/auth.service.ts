import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ROLE_DEFINITIONS } from '../config/permissions';
import { USER_SAFE_SELECT, formatUserWithEffectiveRbac } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { generateSixDigitOtp, sha256Hash } from '../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  signTemp2FAToken,
  verifyRefreshToken,
  verifyTemp2FAToken,
} from '../utils/jwt';
import { AuditService } from './audit.service';
import { MailService } from './mail.service';

export class AuthService {
  /**
   * Bước 1: Đăng nhập bằng Email / Username + Password
   * - Nếu tài khoản bật 2FA (hoặc Role bắt buộc 2FA): sinh OTP 6 số, gửi qua Google Mail và trả về tempToken
   * - Nếu không bật 2FA: cấp ngay bộ JWT AccessToken + RefreshToken
   */
  static async login(params: {
    identifier: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { identifier, password, ipAddress, userAgent } = params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { username: identifier.trim() },
        ],
      },
      include: {
        branch: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    if (!user) {
      throw new AppError('Tài khoản hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        `Tài khoản đang ở trạng thái ${user.status}. Vui lòng liên hệ IT Admin.`,
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(
        `Tài khoản đang bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${user.lockedUntil.toLocaleTimeString('vi-VN')}`,
        403,
        'ACCOUNT_LOCKED'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      await AuditService.log({
        userId: user.id,
        branchId: user.branchId,
        action: 'LOGIN_FAILED_PASSWORD',
        module: 'AUTH',
        ipAddress,
        userAgent,
        metadata: { failedAttempts, locked: shouldLock },
      });

      throw new AppError('Tài khoản hoặc mật khẩu không chính xác', 401, 'INVALID_CREDENTIALS');
    }

    // Kiểm tra yêu cầu bảo mật 2FA qua Google Mail
    const roleRequires2FA = ROLE_DEFINITIONS[user.role]?.require2FA ?? false;
    const mustVerify2FA = user.twoFactorEnabled || roleRequires2FA;

    if (mustVerify2FA) {
      const otpCode = generateSixDigitOtp();
      const otpHash = sha256Hash(otpCode);
      const otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
      const targetEmail = user.twoFactorEmail || user.email;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          otpCodeHash: otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          otpLastSentAt: new Date(),
        },
      });

      const mailResult = await MailService.send2FAOTP({
        toEmail: targetEmail,
        username: user.username,
        otpCode,
        ipAddress,
        branchName: user.branch.name,
      });

      const tempToken = signTemp2FAToken(user.id, targetEmail);

      await AuditService.log({
        userId: user.id,
        branchId: user.branchId,
        action: 'LOGIN_2FA_OTP_SENT',
        module: 'AUTH',
        ipAddress,
        userAgent,
        metadata: { targetEmail, deliveredViaSmtp: mailResult.delivered },
      });

      return {
        requires2FA: true,
        twoFactorMethod: 'GOOGLE_MAIL_OTP',
        maskedEmail: targetEmail.replace(/(.{2})(.*)(?=@)/, (_m, p1, p2) => p1 + '*'.repeat(p2.length)),
        expiresInMinutes: env.OTP_EXPIRES_MINUTES,
        tempToken,
        ...(mailResult.devPreviewOtp ? { devPreviewOtp: mailResult.devPreviewOtp } : {}),
      };
    }

    return this.issueFullSession(user.id, ipAddress, userAgent);
  }

  /**
   * Bước 2: Xác thực mã OTP 6 chữ số nhận qua Google Mail và cấp JWT Token
   */
  static async verify2FA(params: {
    tempToken: string;
    otpCode: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { tempToken, otpCode, ipAddress, userAgent } = params;
    const decoded = verifyTemp2FAToken(tempToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Tài khoản không hợp lệ hoặc đã bị khóa', 401, 'UNAUTHORIZED');
    }

    if (!user.otpCodeHash || !user.otpExpiresAt) {
      throw new AppError('Không tìm thấy yêu cầu xác thực OTP đang chờ', 400, 'NO_PENDING_OTP');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new AppError('Mã OTP đã hết hạn, vui lòng yêu cầu gửi lại mã mới', 401, 'OTP_EXPIRED');
    }

    if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'Bạn đã nhập sai OTP quá số lần quy định. Vui lòng đăng nhập lại.',
        429,
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    const incomingHash = sha256Hash(otpCode.trim());
    if (incomingHash !== user.otpCodeHash) {
      const nextAttempts = user.otpAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: nextAttempts },
      });

      await AuditService.log({
        userId: user.id,
        branchId: user.branchId,
        action: 'LOGIN_2FA_OTP_FAILED',
        module: 'AUTH',
        ipAddress,
        userAgent,
        metadata: { attempts: nextAttempts },
      });

      throw new AppError(
        `Mã OTP không chính xác (Còn ${env.OTP_MAX_ATTEMPTS - nextAttempts} lần thử)`,
        401,
        'INVALID_OTP_CODE'
      );
    }

    // Xóa OTP sau khi xác thực thành công
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    return this.issueFullSession(user.id, ipAddress, userAgent);
  }

  /**
   * Gửi lại mã OTP 2FA qua Google Mail (Chống spam: cách nhau tối thiểu 60 giây)
   */
  static async resend2FA(params: { tempToken: string; ipAddress?: string }) {
    const decoded = verifyTemp2FAToken(params.tempToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { branch: { select: { name: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Tài khoản không hợp lệ', 401, 'UNAUTHORIZED');
    }

    if (user.otpLastSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - user.otpLastSentAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        throw new AppError(
          `Vui lòng đợi ${60 - elapsedSeconds} giây trước khi yêu cầu gửi lại mã OTP`,
          429,
          'OTP_RESEND_COOLDOWN'
        );
      }
    }

    const otpCode = generateSixDigitOtp();
    const otpHash = sha256Hash(otpCode);
    const otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60 * 1000);
    const targetEmail = user.twoFactorEmail || user.email;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCodeHash: otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: new Date(),
      },
    });

    const mailResult = await MailService.send2FAOTP({
      toEmail: targetEmail,
      username: user.username,
      otpCode,
      ipAddress: params.ipAddress,
      branchName: user.branch.name,
    });

    return {
      sent: true,
      expiresInMinutes: env.OTP_EXPIRES_MINUTES,
      ...(mailResult.devPreviewOtp ? { devPreviewOtp: mailResult.devPreviewOtp } : {}),
    };
  }

  /**
   * Khởi tạo phiên đăng nhập hoàn chỉnh (Access Token + Refresh Token + Thông tin Phân quyền Chi nhánh)
   */
  private static async issueFullSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress ?? null,
      },
      select: USER_SAFE_SELECT,
    });

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      dataScope: user.dataScope,
      branchId: user.branchId,
    });

    const jti = crypto.randomUUID();
    const refreshToken = signRefreshToken(user.id, jti);
    const refreshTokenHash = sha256Hash(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await AuditService.log({
      userId: user.id,
      branchId: user.branchId,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      ipAddress,
      userAgent,
    });

    return {
      requires2FA: false,
      accessToken,
      refreshToken,
      user: formatUserWithEffectiveRbac(user),
    };
  }

  /**
   * Làm mới Access Token bằng Refresh Token (Refresh Token Rotation)
   */
  static async refreshSession(params: {
    refreshToken: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const decoded = verifyRefreshToken(params.refreshToken);
    const tokenHash = sha256Hash(params.refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new AppError('Phiên đăng nhập đã hết hạn hoặc bị thu hồi', 401, 'INVALID_REFRESH_TOKEN');
    }

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.issueFullSession(decoded.sub, params.ipAddress, params.userAgent);
  }

  /**
   * Đăng xuất & Thu hồi Refresh Token
   */
  static async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = sha256Hash(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * Đổi mật khẩu cá nhân & thu hồi các phiên cũ
   */
  static async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND');
    }

    const matches = await bcrypt.compare(params.currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError('Mật khẩu hiện tại không chính xác', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(params.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await AuditService.log({
      userId: user.id,
      branchId: user.branchId,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      ipAddress: params.ipAddress,
    });
  }
}
