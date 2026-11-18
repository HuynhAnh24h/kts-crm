import { z } from 'zod';
import { PayrollStatus } from '@prisma/client';

export const attendanceQuerySchema = z.object({
  query: z.object({
    branchId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    productionTeamId: z.string().uuid().optional(),
    month: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
    year: z.coerce.number().min(2020).max(2100).default(new Date().getFullYear()),
    isLocked: z
      .string()
      .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined))
      .optional(),
    search: z.string().optional(),
  }),
});

export const initAttendanceMonthSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Vui lòng chọn Chi nhánh hợp lệ'),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2020).max(2100),
    standardWorkDays: z.coerce.number().min(1).max(31).default(26),
  }),
});

export const updateAttendanceRecordSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID bản ghi công không hợp lệ'),
  }),
  body: z.object({
    standardWorkDays: z.coerce.number().min(1).max(31).optional(),
    actualWorkDays: z.coerce.number().min(0).max(31),
    paidLeaveDays: z.coerce.number().min(0).max(31).default(0),
    unpaidLeaveDays: z.coerce.number().min(0).max(31).default(0),
    overtimeHoursNormal: z.coerce.number().min(0).max(300).default(0),
    overtimeHoursWeekend: z.coerce.number().min(0).max(300).default(0),
    overtimeHoursHoliday: z.coerce.number().min(0).max(300).default(0),
    lateMinutes: z.coerce.number().min(0).default(0),
  }),
});

export const batchLockAttendanceSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Vui lòng chọn Chi nhánh'),
    productionTeamId: z.string().uuid().optional(),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2020).max(2100),
    lock: z.boolean().default(true),
  }),
});

export const calculatePayrollBatchSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Vui lòng chọn Chi nhánh cần tính lương'),
    productionTeamId: z.string().uuid().optional(),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2020).max(2100),
  }),
});

export const updatePayrollAdjustmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID bảng lương không hợp lệ'),
  }),
  body: z.object({
    bonus: z.coerce.number().min(0).default(0),
    advanceDeduction: z.coerce.number().min(0).default(0),
    taxDeduction: z.coerce.number().min(0).default(0),
    otherDeduction: z.coerce.number().min(0).default(0),
  }),
});

export const updatePayrollStatusSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Vui lòng chọn Chi nhánh'),
    productionTeamId: z.string().uuid().optional(),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2020).max(2100),
    status: z.nativeEnum(PayrollStatus),
  }),
});
