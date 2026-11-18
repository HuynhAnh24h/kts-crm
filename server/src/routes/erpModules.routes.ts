import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { ErpModulesController } from '../controllers/erpModules.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticate);

// 1. Dashboard Executive Analytics
router.get('/dashboard-stats', ErpModulesController.getDashboardAnalytics);

// 2. Quản lý Công việc Văn phòng (Office Tasks Kanban)
router.get(
  '/tasks',
  requirePermissions(PERMISSIONS.TASKS_READ),
  ErpModulesController.listTasks
);
router.post(
  '/tasks',
  requirePermissions(PERMISSIONS.TASKS_MANAGE),
  ErpModulesController.createTask
);
router.patch(
  '/tasks/:id',
  requirePermissions(PERMISSIONS.TASKS_READ),
  ErpModulesController.updateTask
);

// 3. Kế hoạch Sản xuất theo Tổ / Chuyền (Production Plans)
router.get(
  '/production-plans',
  requirePermissions(PERMISSIONS.PRODUCTION_READ),
  ErpModulesController.listProductionPlans
);
router.post(
  '/production-plans',
  requirePermissions(PERMISSIONS.PRODUCTION_MANAGE),
  ErpModulesController.createProductionPlan
);
router.patch(
  '/production-plans/:id/progress',
  requirePermissions(PERMISSIONS.PRODUCTION_MANAGE),
  ErpModulesController.updateProductionPlanProgress
);

// 4. Bộ phận Thu mua & Phê duyệt vật tư (Purchasing Workflow)
router.get(
  '/purchase-requests',
  requirePermissions(PERMISSIONS.PURCHASING_READ),
  ErpModulesController.listPurchaseRequests
);
router.post(
  '/purchase-requests',
  requirePermissions(PERMISSIONS.PURCHASING_CREATE),
  ErpModulesController.createPurchaseRequest
);
router.patch(
  '/purchase-requests/:id/status',
  requirePermissions(PERMISSIONS.PURCHASING_APPROVE),
  ErpModulesController.updatePurchaseStatus
);

// 5. Quản lý Khách hàng (Sales Customers)
router.get(
  '/customers',
  requirePermissions(PERMISSIONS.CUSTOMERS_READ),
  ErpModulesController.listCustomers
);
router.post(
  '/customers',
  requirePermissions(PERMISSIONS.CUSTOMERS_MANAGE),
  ErpModulesController.createCustomer
);

export default router;
