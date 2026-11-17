import { Request, Response, NextFunction } from 'express';
import { RoleCode } from '@prisma/client';
import { PermissionCode } from '../config/permissions';
import { AppError } from '../utils/AppError';

/**
 * Kiểm tra người dùng phải thuộc 1 trong các Role được chỉ định
 */
export const requireRoles = (...allowedRoles: RoleCode[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Bạn không có quyền truy cập chức năng này (Yêu cầu vai trò: ${allowedRoles.join(', ')})`,
        403,
        'FORBIDDEN_ROLE'
      );
    }

    next();
  };
};

/**
 * Kiểm tra người dùng có đầy đủ các quyền (Permissions) yêu cầu hay không
 */
export const requirePermissions = (...requiredPermissions: PermissionCode[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const missing = requiredPermissions.filter(
      (perm) => !req.user!.permissions.includes(perm)
    );

    if (missing.length > 0) {
      throw new AppError(
        `Thiếu quyền thao tác: ${missing.join(', ')}`,
        403,
        'FORBIDDEN_PERMISSION'
      );
    }

    next();
  };
};

/**
 * Helper kiểm tra phạm vi Chi nhánh (Branch Isolation theo kiến trúc Hub & Spoke):
 * - Nếu User có scope ALL_BRANCHES (Giám đốc, Super Admin, HR HQ, Kế toán HQ): cho phép mọi branchId
 * - Nếu User thuộc Chi nhánh/Xưởng (OWN_BRANCH...): chỉ được phép truy cập branchId nằm trong allowedBranchIds
 */
export const assertBranchAccess = (req: Request, targetBranchId: string): void => {
  if (!req.user || !req.branchContext) {
    throw new AppError('Chưa xác thực người dùng', 401, 'UNAUTHORIZED');
  }

  if (req.branchContext.isAllBranches) {
    return;
  }

  if (!req.branchContext.allowedBranchIds.includes(targetBranchId)) {
    throw new AppError(
      'Truy cập bị từ chối: Tài khoản của bạn chỉ được phép xem và thao tác trên dữ liệu thuộc Chi nhánh / Nhà xưởng của mình.',
      403,
      'CROSS_BRANCH_ACCESS_DENIED'
    );
  }
};
