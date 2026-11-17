import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserPermissionsSchema,
  updateUserSchema,
} from '../validators/user.validator';

const router = Router();

router.use(authenticate);

// Lấy danh mục Roles, Permissions, DataScopes & NAS Folder Group
router.get('/rbac-matrix', requirePermissions(PERMISSIONS.USERS_READ), UserController.getRbacMatrix);

// Nhật ký thao tác hệ thống (Audit Logs)
router.get('/audit-logs', requirePermissions(PERMISSIONS.AUDIT_LOGS_READ), UserController.listAuditLogs);

// Quản lý danh sách User (Tự động lọc theo Chi nhánh nếu là HR/Admin Chi nhánh)
router.get(
  '/',
  requirePermissions(PERMISSIONS.USERS_READ),
  validateRequest(listUsersQuerySchema),
  UserController.listUsers
);

router.get('/:id', requirePermissions(PERMISSIONS.USERS_READ), UserController.getUserById);

router.post(
  '/',
  requirePermissions(PERMISSIONS.USERS_CREATE),
  validateRequest(createUserSchema),
  UserController.createUser
);

router.patch(
  '/:id',
  requirePermissions(PERMISSIONS.USERS_UPDATE),
  validateRequest(updateUserSchema),
  UserController.updateUser
);

router.patch(
  '/:id/permissions',
  requirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE),
  validateRequest(updateUserPermissionsSchema),
  UserController.updateUserPermissions
);

export default router;
