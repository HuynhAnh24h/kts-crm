import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { USER_SAFE_SELECT, formatUserWithEffectiveRbac } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class AuthController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login({
      identifier: req.body.identifier,
      password: req.body.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const msg = result.requires2FA
      ? 'Đã gửi mã OTP xác thực 2 lớp (2FA) tới Google Mail của bạn'
      : 'Đăng nhập thành công';

    return sendSuccess(res, result, msg, 200);
  });

  static verify2FA = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.verify2FA({
      tempToken: req.body.tempToken,
      otpCode: req.body.otpCode,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, result, 'Xác thực 2FA thành công', 200);
  });

  static resend2FA = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.resend2FA({
      tempToken: req.body.tempToken,
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, 'Đã gửi lại mã OTP 2FA qua Google Mail', 200);
  });

  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.refreshSession({
      refreshToken: req.body.refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, result, 'Làm mới phiên đăng nhập thành công', 200);
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    await AuthService.logout(req.body?.refreshToken, req.user?.id);
    return sendSuccess(res, null, 'Đăng xuất thành công', 200);
  });

  static me = asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: USER_SAFE_SELECT,
    });

    return sendSuccess(
      res,
      user ? formatUserWithEffectiveRbac(user) : null,
      'Thông tin tài khoản hiện tại'
    );
  });

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    await AuthService.changePassword({
      userId: req.user!.id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      null,
      'Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác.'
    );
  });
}
