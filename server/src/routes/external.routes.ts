import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { ExternalSyncController } from '../controllers/externalSync.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { verifyExternalGatewayAuth } from '../middlewares/externalHmac.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';

const router = Router();

/**
 * Luồng 4 trên sơ đồ https://tai-lieu-network.vercel.app/:
 * Các cổng /api/v1/external/* đi qua Cloudflare API Gateway + WAF
 * Bảo vệ bằng IP Whitelist + X-API-Key + Chữ ký HMAC-SHA256
 */
router.post(
  '/attendance/webhook-sync',
  verifyExternalGatewayAuth,
  ExternalSyncController.attendanceWebhookSync
);

router.get(
  '/payroll/locked-attendance',
  verifyExternalGatewayAuth,
  ExternalSyncController.getLockedAttendance
);

router.post(
  '/payroll/sync-results',
  verifyExternalGatewayAuth,
  ExternalSyncController.syncPayrollResults
);

/**
 * Luồng 3 trên sơ đồ:
 * PC Kế toán / HR Xưởng xuất lệnh in Phiếu lương K80/A4 hàng loạt theo Tổ / Chuyền
 */
router.post(
  '/payslips/print-batch',
  authenticate,
  requirePermissions(PERMISSIONS.PAYROLL_PRINT_SLIP),
  ExternalSyncController.printBatchPayslips
);

export default router;
