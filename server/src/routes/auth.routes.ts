import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resend2FASchema,
  verify2FASchema,
} from '../validators/auth.validator';

const router = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: {
    success: false,
    code: 'TOO_MANY_AUTH_REQUESTS',
    message: 'Quá nhiều yêu cầu xác thực từ IP này, vui lòng thử lại sau 15 phút.',
  },
});

// Public Auth Routes (Login + Google Mail 2FA OTP + Token Refresh)
router.post('/login', authRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/verify-2fa', authRateLimiter, validateRequest(verify2FASchema), AuthController.verify2FA);
router.post('/resend-2fa', authRateLimiter, validateRequest(resend2FASchema), AuthController.resend2FA);
router.post('/refresh', validateRequest(refreshTokenSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected Auth Routes
router.get('/me', authenticate, AuthController.me);
router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  AuthController.changePassword
);

export default router;
