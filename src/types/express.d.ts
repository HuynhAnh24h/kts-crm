import { DataScope, RoleCode } from '@prisma/client';
import { PermissionCode } from '../config/permissions';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: RoleCode;
  dataScope: DataScope;
  branchId: string;
  allowedBranchIds: string[];
  permissions: PermissionCode[];
  employeeId?: string | null;
  departmentId?: string | null;
  productionTeamId?: string | null;
}

export interface BranchFilterContext {
  isAllBranches: boolean;
  allowedBranchIds: string[];
  departmentId?: string | null;
  productionTeamId?: string | null;
  selfEmployeeId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      branchContext?: BranchFilterContext;
    }
  }
}
