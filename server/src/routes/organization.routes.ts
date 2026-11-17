import { Router } from 'express';
import { PERMISSIONS } from '../config/permissions';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createBranchSchema,
  createDepartmentSchema,
  createProductionTeamSchema,
} from '../validators/organization.validator';

const router = Router();

router.use(authenticate);

// 1. Chi nhánh (HQ Hub & Nhà xưởng Spoke)
router.get(
  '/branches',
  requirePermissions(PERMISSIONS.BRANCHES_READ),
  OrganizationController.listBranches
);
router.post(
  '/branches',
  requirePermissions(PERMISSIONS.BRANCHES_MANAGE),
  validateRequest(createBranchSchema),
  OrganizationController.createBranch
);

// 2. Phòng ban (Kèm cấu hình NAS Share ABE & AD Group)
router.get(
  '/departments',
  requirePermissions(PERMISSIONS.DEPARTMENTS_READ),
  OrganizationController.listDepartments
);
router.post(
  '/departments',
  requirePermissions(PERMISSIONS.DEPARTMENTS_MANAGE),
  validateRequest(createDepartmentSchema),
  OrganizationController.createDepartment
);

// 3. Tổ / Chuyền sản xuất (Phân nhóm công nhân & In phiếu lương K80/A4)
router.get(
  '/production-teams',
  requirePermissions(PERMISSIONS.TEAMS_READ),
  OrganizationController.listProductionTeams
);
router.post(
  '/production-teams',
  requirePermissions(PERMISSIONS.TEAMS_MANAGE),
  validateRequest(createProductionTeamSchema),
  OrganizationController.createProductionTeam
);

export default router;
