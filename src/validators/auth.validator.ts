import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    identifier: z
      .string({ required_error: 'Vui lòng nhập Email hoặc Username' })
      .min(3, 'Email hoặc Username phải từ 3 ký tự'),
    password: z
      .string({ required_error: 'Vui lòng nhập mật khẩu' })
      .min(6, 'Mật khẩu phải từ 6 ký tự'),
  }),
});

export const verify2FASchema = z.object({
  body: z.object({
    tempToken: z.string({ required_error: 'Thiếu tempToken phiên 2FA' }).min(10),
    otpCode: z
      .string({ required_error: 'Vui lòng nhập mã OTP 6 chữ số' })
      .regex(/^\d{6}$/, 'Mã OTP phải gồm đúng 6 chữ số'),
  }),
});

export const resend2FASchema = z.object({
  body: z.object({
    tempToken: z.string({ required_error: 'Thiếu tempToken phiên 2FA' }).min(10),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Thiếu refreshToken' }).min(10),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6, 'Mật khẩu hiện tại phải từ 6 ký tự'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu mới phải từ 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Mật khẩu mới phải chứa ít nhất 1 chữ số'),
  }),
});

export const toggleOwn2FASchema = z.object({
  body: z.object({
    enabled: z.boolean(),
    twoFactorEmail: z.string().email('Email nhận OTP 2FA không hợp lệ').optional(),
  }),
});
