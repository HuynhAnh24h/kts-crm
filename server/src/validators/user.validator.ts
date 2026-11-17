import { z } from 'zod';
import { AccountStatus, DataScope, RoleCode } from '@prisma/client';
import { ALL_PERMISSION_CODES } from '../config/permissions';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Email không hợp lệ'),
    username: z
      .string()
      .min(3, 'Username tối thiểu 3 ký tự')
      .max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username chỉ chứa chữ cái, số và dấu . _ -'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải từ 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
    role: z.nativeEnum(RoleCode).default(RoleCode.OFFICE_STAFF),
    dataScope: z.nativeEnum(DataScope).optional(),
    branchId: z.string().uuid('branchId phải là UUID hợp lệ'),
    allowedBranchIds: z.array(z.string().uuid()).optional(),
    customPermissions: z
      .array(z.enum(ALL_PERMISSION_CODES as [string, ...string[]]))
      .optional(),
    revokedPermissions: z
      .array(z.enum(ALL_PERMISSION_CODES as [string, ...string[]]))
      .optional(),
    twoFactorEnabled: z.boolean().default(true),
    twoFactorEmail: z.string().email().optional(),
    adLdapDn: z.string().optional(),
    employeeId: z.string().uuid().optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID tài khoản không hợp lệ'),
  }),
  body: z.object({
    email: z.string().email().optional(),
    branchId: z.string().uuid().optional(),
    allowedBranchIds: z.array(z.string().uuid()).optional(),
    twoFactorEnabled: z.boolean().optional(),
    twoFactorEmail: z.string().email().nullable().optional(),
    adLdapDn: z.string().nullable().optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    resetPassword: z.string().min(8).optional(),
  }),
});

export const updateUserPermissionsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID tài khoản không hợp lệ'),
  }),
  body: z.object({
    role: z.nativeEnum(RoleCode).optional(),
    dataScope: z.nativeEnum(DataScope).optional(),
    allowedBranchIds: z.array(z.string().uuid()).optional(),
    customPermissions: z
      .array(z.enum(ALL_PERMISSION_CODES as [string, ...string[]]))
      .optional(),
    revokedPermissions: z
      .array(z.enum(ALL_PERMISSION_CODES as [string, ...string[]]))
      .optional(),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    branchId: z.string().uuid().optional(),
    role: z.nativeEnum(RoleCode).optional(),
    status: z.nativeEnum(AccountStatus).optional(),
    search: z.string().optional(),
  }),
});
