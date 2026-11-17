import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('KTS Internal CRM'),
  CLIENT_URL: z.string().default('http://crm.noibo.local'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://crm.noibo.local'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_TEMP_2FA_SECRET: z.string().min(16, 'JWT_TEMP_2FA_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_TEMP_2FA_EXPIRES_IN: z.string().default('5m'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('KTS CRM Security <no-reply@crm.noibo.local>'),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  EXTERNAL_API_KEY: z.string().min(10),
  EXTERNAL_HMAC_SECRET: z.string().min(10),
  EXTERNAL_IP_WHITELIST: z.string().default('127.0.0.1,::1'),

  NAS_CONTRACT_PDF_MOUNT_PATH: z.string().default('./storage/nas/contracts'),
  NAS_BACKUP_MOUNT_PATH: z.string().default('./storage/nas/backups'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
