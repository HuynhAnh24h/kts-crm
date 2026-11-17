import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { resolveEffectivePermissions } from '../config/permissions';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/jwt';

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để tiếp tục (Missing Bearer Token)', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          select: {
            id: true,
            departmentId: true,
            productionTeamId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Tài khoản không tồn tại trong hệ thống', 401, 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        `Tài khoản hiện đang ở trạng thái ${user.status}. Vui lòng liên hệ IT Admin.`,
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(
        `Tài khoản đang tạm khóa đến ${user.lockedUntil.toISOString()}`,
        403,
        'ACCOUNT_TEMPORARILY_LOCKED'
      );
    }

    const effectivePermissions = resolveEffectivePermissions(
      user.role,
      user.customPermissions,
      user.revokedPermissions
    );

    const allowedBranches = Array.from(new Set([user.branchId, ...user.allowedBranchIds]));
    const isAllBranches = user.dataScope === 'ALL_BRANCHES' || user.role === 'SUPER_ADMIN';

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      dataScope: user.dataScope,
      branchId: user.branchId,
      allowedBranchIds: allowedBranches,
      permissions: effectivePermissions,
      employeeId: user.employee?.id ?? null,
      departmentId: user.employee?.departmentId ?? null,
      productionTeamId: user.employee?.productionTeamId ?? null,
    };

    req.branchContext = {
      isAllBranches,
      allowedBranchIds: allowedBranches,
      departmentId: user.employee?.departmentId ?? null,
      productionTeamId: user.employee?.productionTeamId ?? null,
      selfEmployeeId: user.employee?.id ?? null,
    };

    next();
  }
);
