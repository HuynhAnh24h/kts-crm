import { Request, Response } from 'express';
import { PayslipFormat } from '@prisma/client';
import { ExternalSyncService } from '../services/externalSync.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class ExternalSyncController {
  /**
   * POST /api/v1/external/attendance/webhook-sync
   * Được gọi từ Phần mềm Chấm công Cloud qua Cloudflare API Gateway + WAF
   */
  static attendanceWebhookSync = asyncHandler(async (req: Request, res: Response) => {
    const result = await ExternalSyncService.syncAttendanceFromCloud(req.body, req.ip);
    return sendSuccess(res, result, 'Đồng bộ dữ liệu chấm công từ Cloud thành công');
  });

  /**
   * GET /api/v1/external/payroll/locked-attendance
   * Phần mềm Tính lương Riêng GET danh sách công đã khóa + Lương hợp đồng
   */
  static getLockedAttendance = asyncHandler(async (req: Request, res: Response) => {
    const result = await ExternalSyncService.getLockedAttendanceWithContracts({
      month: Number(req.query.month),
      year: Number(req.query.year),
      branchCode: req.query.branchCode as string | undefined,
    });
    return sendSuccess(res, result, 'Danh sách công đã khóa kèm Lương hợp đồng');
  });

  /**
   * POST /api/v1/external/payroll/sync-results
   * Phần mềm Tính lương Riêng POST bảng lương đã tính xong về CRM
   */
  static syncPayrollResults = asyncHandler(async (req: Request, res: Response) => {
    const result = await ExternalSyncService.syncCalculatedPayrollToCrm(req.body, req.ip);
    return sendSuccess(res, result, 'Đồng bộ bảng lương vào CRM thành công');
  });

  /**
   * POST /api/v1/external/payslips/print-batch
   * Kế toán / HR Xưởng xuất lệnh in Phiếu lương K80/A4 hàng loạt theo Tổ / Chuyền
   */
  static printBatchPayslips = asyncHandler(async (req: Request, res: Response) => {
    const result = await ExternalSyncService.exportBatchPayslipsByTeam(
      req.user!,
      req.branchContext!,
      {
        branchId: req.body.branchId,
        productionTeamId: req.body.productionTeamId,
        month: Number(req.body.month),
        year: Number(req.body.year),
        format: (req.body.format as PayslipFormat) || 'K80_THERMAL',
      },
      req.ip
    );
    return sendSuccess(res, result, 'Xuất dữ liệu in phiếu lương theo Tổ/Chuyền thành công');
  });
}
