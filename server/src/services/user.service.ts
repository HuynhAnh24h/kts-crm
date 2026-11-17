import bcrypt from 'bcryptjs';
import { AccountStatus, DataScope, Prisma, RoleCode } from '@prisma/client';
import { prisma } from '../config/database';
import {
  ALL_PERMISSION_CODES,
  ROLE_DEFINITIONS,
} from '../config/permissions';
import {
  USER_SAFE_SELECT,
  buildUserBranchScopeWhere,
  formatUserWithEffectiveRbac,
} from '../models/user.model';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

export class UserService {
  /**
   * Lấy bảng cấu hình Ma trận Phân quyền (RBAC Roles, Permissions, Scopes, NAS Group)
   */
  static getRbacMatrix() {
    return {
      roles: Object.values(ROLE_DEFINITIONS),
      permissions: ALL_PERMISSION_CODES,
      dataScopes: [
        {
          code: 'ALL_BRANCHES',
          description: 'Truy cập dữ liệu tất cả chi nhánh (HQ Hub & toàn bộ Nhà xưởng)',
        },
        {
          code: 'OWN_BRANCH',
          description: 'Chỉ truy cập dữ liệu thuộc Chi nhánh / Nhà xưởng được phân công',
        },
        {
          code: 'OWN_DEPARTMENT',
          description: 'Chỉ truy cập dữ liệu thuộc Phòng ban của mình tại Chi nhánh',
        },
        {
          code: 'OWN_TEAM',
          description: 'Chỉ truy cập dữ liệu thuộc Tổ / Chuyền sản xuất của mình',
        },
        {
          code: 'SELF',
          description: 'Chỉ truy cập hồ sơ, công và phiếu lương cá nhân',
        },
      ],
    };
  }

  /**
   * Danh sách tài khoản có phân trang & tự động lọc theo phạm vi Chi nhánh của người gọi
   */
  static async listUsers(
    branchContext: BranchFilterContext,
    query: {
      page?: number;
      limit?: number;
      branchId?: string;
      role?: RoleCode;
      status?: AccountStatus;
      search?: string;
    }
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...buildUserBranchScopeWhere(branchContext, query.branchId),
    };

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { employee: { fullName: { contains: q, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => formatUserWithEffectiveRbac(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xem chi tiết 1 tài khoản (kiểm tra quyền Chi nhánh)
   */
  static async getUserById(targetUserId: string, branchContext: BranchFilterContext) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND');
    }

    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(user.branchId)
    ) {
      throw new AppError(
        'Bạn không có quyền xem tài khoản thuộc Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    return formatUserWithEffectiveRbac(user);
  }

  /**
   * Tạo tài khoản người dùng mới + gắn Chi nhánh, Role, Scope & cấu hình 2FA Google Mail
   */
  static async createUser(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      email: string;
      username: string;
      password: string;
      role: RoleCode;
      dataScope?: DataScope;
      branchId: string;
      allowedBranchIds?: string[];
      customPermissions?: string[];
      revokedPermissions?: string[];
      twoFactorEnabled?: boolean;
      twoFactorEmail?: string;
      adLdapDn?: string;
      employeeId?: string;
    },
    ipAddress?: string
  ) {
    // Không cho phép user cấp dưới tạo tài khoản SUPER_ADMIN hoặc DIRECTOR nếu không phải SUPER_ADMIN
    if (
      (input.role === 'SUPER_ADMIN' || input.role === 'DIRECTOR') &&
      actor.role !== 'SUPER_ADMIN'
    ) {
      throw new AppError(
        'Chỉ Super Admin mới được phép khởi tạo tài khoản cấp Giám đốc hoặc Super Admin',
        403,
        'INSUFFICIENT_ROLE_PRIVILEGE'
      );
    }

    // Kiểm tra phạm vi Chi nhánh
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(input.branchId)
    ) {
      throw new AppError(
        'Bạn chỉ được phép tạo tài khoản trong phạm vi Chi nhánh của mình',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) {
      throw new AppError('Chi nhánh không tồn tại', 404, 'BRANCH_NOT_FOUND');
    }

    const roleDef = ROLE_DEFINITIONS[input.role];
    const resolvedScope = input.dataScope ?? roleDef.defaultScope;
    const passwordHash = await bcrypt.hash(input.password, 12);

    const createdUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase().trim(),
          username: input.username.trim(),
          passwordHash,
          role: input.role,
          dataScope: resolvedScope,
          branchId: input.branchId,
          allowedBranchIds: input.allowedBranchIds ?? [input.branchId],
          customPermissions: input.customPermissions ?? [],
          revokedPermissions: input.revokedPermissions ?? [],
          twoFactorEnabled: input.twoFactorEnabled ?? roleDef.require2FA,
          twoFactorEmail: input.twoFactorEmail ?? null,
          adLdapDn: input.adLdapDn ?? null,
        },
        select: USER_SAFE_SELECT,
      });

      if (input.employeeId) {
        await tx.employee.update({
          where: { id: input.employeeId },
          data: { userId: newUser.id },
        });
      }

      return newUser;
    });

    await AuditService.log({
      userId: actor.id,
      branchId: createdUser.branchId,
      action: 'USER_CREATED',
      module: 'USERS',
      targetId: createdUser.id,
      ipAddress,
      newValues: {
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
        dataScope: createdUser.dataScope,
        branchId: createdUser.branchId,
      },
    });

    return formatUserWithEffectiveRbac(createdUser);
  }

  /**
   * Cập nhật thông tin tài khoản, trạng thái Khóa/Mở khóa, cấu hình 2FA hoặc Reset mật khẩu
   */
  static async updateUser(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    targetUserId: string,
    input: {
      email?: string;
      branchId?: string;
      allowedBranchIds?: string[];
      twoFactorEnabled?: boolean;
      twoFactorEmail?: string | null;
      adLdapDn?: string | null;
      status?: AccountStatus;
      resetPassword?: string;
    },
    ipAddress?: string
  ) {
    const existing = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existing) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND');
    }

    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(existing.branchId)
    ) {
      throw new AppError(
        'Không có quyền chỉnh sửa tài khoản thuộc Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    if (existing.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new AppError('Không thể chỉnh sửa tài khoản Super Admin', 403, 'FORBIDDEN');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) updateData.email = input.email.toLowerCase().trim();
    if (input.branchId !== undefined) {
      updateData.branch = { connect: { id: input.branchId } };
    }
    if (input.allowedBranchIds !== undefined) {
      updateData.allowedBranchIds = input.allowedBranchIds;
    }
    if (input.twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = input.twoFactorEnabled;
    }
    if (input.twoFactorEmail !== undefined) {
      updateData.twoFactorEmail = input.twoFactorEmail;
    }
    if (input.adLdapDn !== undefined) {
      updateData.adLdapDn = input.adLdapDn;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.resetPassword) {
      updateData.passwordHash = await bcrypt.hash(input.resetPassword, 12);
      updateData.passwordChangedAt = new Date();
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: USER_SAFE_SELECT,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: updated.branchId,
      action: 'USER_UPDATED',
      module: 'USERS',
      targetId: updated.id,
      ipAddress,
      oldValues: {
        status: existing.status,
        branchId: existing.branchId,
        twoFactorEnabled: existing.twoFactorEnabled,
      },
      newValues: {
        status: updated.status,
        branchId: updated.branchId,
        twoFactorEnabled: updated.twoFactorEnabled,
        passwordReset: Boolean(input.resetPassword),
      },
    });

    return formatUserWithEffectiveRbac(updated);
  }

  /**
   * Phân quyền chuyên sâu cho User: Role, DataScope (ALL_BRANCHES / OWN_BRANCH...),
   * Quyền cộng thêm (customPermissions) & Quyền thu hồi (revokedPermissions)
   */
  static async updateUserPermissions(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    targetUserId: string,
    input: {
      role?: RoleCode;
      dataScope?: DataScope;
      allowedBranchIds?: string[];
      customPermissions?: string[];
      revokedPermissions?: string[];
    },
    ipAddress?: string
  ) {
    const existing = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!existing) {
      throw new AppError('Tài khoản không tồn tại', 404, 'USER_NOT_FOUND');
    }

    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(existing.branchId)
    ) {
      throw new AppError(
        'Không có quyền phân quyền cho tài khoản thuộc Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    if (
      (input.role === 'SUPER_ADMIN' || input.dataScope === 'ALL_BRANCHES') &&
      actor.role !== 'SUPER_ADMIN' &&
      actor.role !== 'IT_ADMIN'
    ) {
      throw new AppError(
        'Chỉ Super Admin hoặc IT Admin mới được cấp quyền ALL_BRANCHES hoặc SUPER_ADMIN',
        403,
        'INSUFFICIENT_ROLE_PRIVILEGE'
      );
    }

    const nextRole = input.role ?? existing.role;
    const nextScope =
      input.dataScope ??
      (input.role ? ROLE_DEFINITIONS[input.role].defaultScope : existing.dataScope);

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: nextRole,
        dataScope: nextScope,
        ...(input.allowedBranchIds !== undefined
          ? { allowedBranchIds: input.allowedBranchIds }
          : {}),
        ...(input.customPermissions !== undefined
          ? { customPermissions: input.customPermissions }
          : {}),
        ...(input.revokedPermissions !== undefined
          ? { revokedPermissions: input.revokedPermissions }
          : {}),
      },
      select: USER_SAFE_SELECT,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: updated.branchId,
      action: 'USER_RBAC_UPDATED',
      module: 'USERS',
      targetId: updated.id,
      ipAddress,
      oldValues: {
        role: existing.role,
        dataScope: existing.dataScope,
        customPermissions: existing.customPermissions,
        revokedPermissions: existing.revokedPermissions,
      },
      newValues: {
        role: updated.role,
        dataScope: updated.dataScope,
        customPermissions: updated.customPermissions,
        revokedPermissions: updated.revokedPermissions,
      },
    });

    return formatUserWithEffectiveRbac(updated);
  }
}
