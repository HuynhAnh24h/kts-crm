import nodemailer from 'nodemailer';
import { env } from './env';

export const isMailConfigured = (): boolean => {
  return Boolean(
    env.SMTP_USER &&
      env.SMTP_PASS &&
      !env.SMTP_USER.includes('your-company-email') &&
      !env.SMTP_PASS.includes('your-16-char')
  );
};

export const mailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: isMailConfigured()
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      }
    : undefined,
});
