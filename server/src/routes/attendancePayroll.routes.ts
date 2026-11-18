import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { AttendancePayrollController } from '../controllers/attendancePayroll.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  attendanceQuerySchema,
  batchLockAttendanceSchema,
  calculatePayrollBatchSchema,
  initAttendanceMonthSchema,
  updateAttendanceRecordSchema,
  updatePayrollAdjustmentSchema,
  updatePayrollStatusSchema,
} from '../validators/attendancePayroll.validator';

const router = Router();

router.use(authenticate);

// ============================================================================
// 1. NHÂN SỰ CHẤM CÔNG & KHÓA CÔNG (ATTENDANCE & TIMESHEET)
// ============================================================================

router.get(
  '/attendance',
  requirePermissions(PERMISSIONS.ATTENDANCE_READ),
  validateRequest(attendanceQuerySchema),
  AttendancePayrollController.listAttendance
);

router.post(
  '/attendance/initialize',
  requirePermissions(PERMISSIONS.ATTENDANCE_UPDATE),
  validateRequest(initAttendanceMonthSchema),
  AttendancePayrollController.initMonthlyAttendance
);

router.post(
  '/attendance/pull-device-logs',
  requirePermissions(PERMISSIONS.ATTENDANCE_UPDATE),
  AttendancePayrollController.pullDeviceLogs
);

router.post(
  '/attendance/import-rows',
  requirePermissions(PERMISSIONS.ATTENDANCE_UPDATE),
  AttendancePayrollController.importAttendanceCsv
);

router.patch(
  '/attendance/:id',
  requirePermissions(PERMISSIONS.ATTENDANCE_UPDATE),
  validateRequest(updateAttendanceRecordSchema),
  AttendancePayrollController.updateAttendanceRecord
);

router.post(
  '/attendance/batch-lock',
  requirePermissions(PERMISSIONS.ATTENDANCE_LOCK),
  validateRequest(batchLockAttendanceSchema),
  AttendancePayrollController.batchLockAttendance
);

// ============================================================================
// 2. KẾ TOÁN TÍNH LƯƠNG & DUYỆT BẢNG LƯƠNG (PAYROLL & APPROVAL)
// ============================================================================

router.get(
  '/payrolls',
  requirePermissions(PERMISSIONS.PAYROLL_READ),
  validateRequest(attendanceQuerySchema),
  AttendancePayrollController.listPayrolls
);

router.post(
  '/payrolls/calculate-batch',
  requirePermissions(PERMISSIONS.PAYROLL_CALCULATE),
  validateRequest(calculatePayrollBatchSchema),
  AttendancePayrollController.calculateBatchPayroll
);

router.patch(
  '/payrolls/:id/adjustments',
  requirePermissions(PERMISSIONS.PAYROLL_CALCULATE),
  validateRequest(updatePayrollAdjustmentSchema),
  AttendancePayrollController.updatePayrollAdjustments
);

router.post(
  '/payrolls/batch-status',
  requirePermissions(PERMISSIONS.PAYROLL_APPROVE),
  validateRequest(updatePayrollStatusSchema),
  AttendancePayrollController.updateBatchPayrollStatus
);

export default router;
