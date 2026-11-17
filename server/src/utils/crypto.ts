import crypto from 'crypto';

/**
 * Sinh mã OTP 6 chữ số ngẫu nhiên an toàn mật mã học (dùng cho 2FA qua Google Mail)
 */
export const generateSixDigitOtp = (): string => {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
};

/**
 * Băm SHA-256 cho OTP hoặc Refresh Token trước khi lưu vào DB
 */
export const sha256Hash = (raw: string): string => {
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * Xác thực chữ ký HMAC-SHA256 cho các luồng API External (/api/v1/external/*)
 * (Cloud Attendance Software & Phần mềm Tính lương Riêng)
 */
export const verifyHmacSha256 = (
  payload: string,
  secret: string,
  providedSignature: string
): boolean => {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(providedSignature, 'utf8');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
};
