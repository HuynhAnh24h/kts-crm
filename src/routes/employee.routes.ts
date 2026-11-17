import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createContractSchema,
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  updateSelfProfileSchema,
} from '../validators/employee.validator';

const router = Router();

router.use(authenticate);

// Hồ sơ cá nhân của nhân viên đang đăng nhập
router.get('/me', EmployeeController.getMyProfile);
router.patch(
  '/me',
  validateRequest(updateSelfProfileSchema),
  EmployeeController.updateMyProfile
);

// Quản lý danh sách Hồ sơ Nhân viên (Tự động áp dụng Branch Scope: ALL_BRANCHES / OWN_BRANCH / OWN_DEPARTMENT / OWN_TEAM / SELF)
router.get(
  '/',
  requirePermissions(PERMISSIONS.EMPLOYEES_READ),
  validateRequest(listEmployeesQuerySchema),
  EmployeeController.listEmployees
);

router.get(
  '/:id',
  requirePermissions(PERMISSIONS.EMPLOYEES_READ),
  EmployeeController.getEmployeeById
);

router.post(
  '/',
  requirePermissions(PERMISSIONS.EMPLOYEES_CREATE),
  validateRequest(createEmployeeSchema),
  EmployeeController.createEmployee
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.EMPLOYEES_UPDATE),
  validateRequest(updateEmployeeSchema),
  EmployeeController.updateEmployee
);

// Quản lý Hợp đồng lao động & đường dẫn file HĐ PDF trên NAS Enterprise
router.post(
  '/:id/contracts',
  requirePermissions(PERMISSIONS.CONTRACTS_MANAGE),
  validateRequest(createContractSchema),
  EmployeeController.addContract
);

export default router;
