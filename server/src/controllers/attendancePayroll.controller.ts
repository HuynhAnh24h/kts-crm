import { Request, Response } from 'express';
import { AttendancePayrollService } from '../services/attendancePayroll.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class AttendancePayrollController {
  static listAttendance = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.listAttendance(
      req.user!,
      req.branchContext!,
      req.query as Record<string, unknown>
    );
    return sendSuccess(res, result, 'Danh sách bảng tổng hợp công');
  });

  static initMonthlyAttendance = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.initializeMonthlyAttendance(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(
      res,
      result,
      `Đã khởi tạo bảng công tháng ${result.month}/${result.year} (${result.createdCount} bản ghi mới)`,
      201
    );
  });

  static updateAttendanceRecord = asyncHandler(async (req: Request, res: Response) => {
    const updated = await AttendancePayrollService.updateAttendanceRecord(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Cập nhật ngày công & giờ tăng ca thành công');
  });

  static batchLockAttendance = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.batchLockUnlockAttendance(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    const msg = result.isLocked
      ? `Đã KHÓA CÔNG thành công (${result.affectedCount} nhân viên) để chuyển sang Kế toán tính lương`
      : `Đã MỞ KHÓA bảng công (${result.affectedCount} nhân viên)`;
    return sendSuccess(res, result, msg);
  });

  static listPayrolls = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.listPayrolls(
      req.user!,
      req.branchContext!,
      req.query as Record<string, unknown>
    );
    return sendSuccess(res, result, 'Danh sách bảng tính lương nhân sự');
  });

  static calculateBatchPayroll = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.calculateBatchPayroll(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(
      res,
      result,
      `Đã tính lương tự động thành công cho ${result.calculatedCount} nhân viên có công đã khóa`
    );
  });

  static updatePayrollAdjustments = asyncHandler(async (req: Request, res: Response) => {
    const updated = await AttendancePayrollService.updatePayrollAdjustments(
      req.user!,
      req.branchContext!,
      req.params.id as string,
      req.body,
      req.ip
    );
    return sendSuccess(res, updated, 'Đã cập nhật khoản Thưởng / Tạm ứng / Khấu trừ');
  });

  static updateBatchPayrollStatus = asyncHandler(async (req: Request, res: Response) => {
    const result = await AttendancePayrollService.updateBatchPayrollStatus(
      req.user!,
      req.branchContext!,
      req.body,
      req.ip
    );
    return sendSuccess(
      res,
      result,
      `Đã chuyển trạng thái ${result.affectedCount} phiếu lương sang ${result.status}`
    );
  });
}
