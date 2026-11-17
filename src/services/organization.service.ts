import { BranchType, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import {
  BRANCH_SUMMARY_INCLUDE,
  DEPARTMENT_SUMMARY_INCLUDE,
  PRODUCTION_TEAM_SUMMARY_INCLUDE,
} from '../models/organization.model';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

export class OrganizationService {
  /**
   * Danh sách Chi nhánh (HQ Hub & Spoke Factories) theo quyền truy cập của User
   */
  static async listBranches(branchContext: BranchFilterContext) {
    const where: Prisma.BranchWhereInput = branchContext.isAllBranches
      ? {}
      : { id: { in: branchContext.allowedBranchIds } };

    return prisma.branch.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      include: BRANCH_SUMMARY_INCLUDE,
    });
  }

  static async createBranch(
    actor: AuthenticatedUser,
    input: {
      code: string;
      name: string;
      type?: BranchType;
      subnetCidr?: string;
      officeVlanCidr?: string;
      iotVlanCidr?: string;
      warpTunnelId?: string;
      address?: string;
      phone?: string;
    },
    ipAddress?: string
  ) {
    const branch = await prisma.branch.create({
      data: {
        ...input,
        code: input.code.trim().toUpperCase(),
      },
      include: BRANCH_SUMMARY_INCLUDE,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: branch.id,
      action: 'BRANCH_CREATED',
      module: 'ORGANIZATION',
      targetId: branch.id,
      ipAddress,
      newValues: branch,
    });

    return branch;
  }

  /**
   * Danh sách Phòng ban (kèm cấu hình đường dẫn NAS SMB ABE & Active Directory Group)
   */
  static async listDepartments(
    branchContext: BranchFilterContext,
    branchId?: string
  ) {
    const where: Prisma.DepartmentWhereInput = {};
    if (branchContext.isAllBranches) {
      if (branchId) where.branchId = branchId;
    } else {
      where.branchId =
        branchId && branchContext.allowedBranchIds.includes(branchId)
          ? branchId
          : { in: branchContext.allowedBranchIds };
    }

    return prisma.department.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { code: 'asc' }],
      include: DEPARTMENT_SUMMARY_INCLUDE,
    });
  }

  static async createDepartment(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      code: string;
      name: string;
      nasSharePath?: string;
      adGroupDn?: string;
      description?: string;
    },
    ipAddress?: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(input.branchId)
    ) {
      throw new AppError(
        'Không có quyền tạo phòng ban cho Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const dept = await prisma.department.create({
      data: {
        ...input,
        code: input.code.trim().toUpperCase(),
      },
      include: DEPARTMENT_SUMMARY_INCLUDE,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: dept.branchId,
      action: 'DEPARTMENT_CREATED',
      module: 'ORGANIZATION',
      targetId: dept.id,
      ipAddress,
      newValues: dept,
    });

    return dept;
  }

  /**
   * Danh sách Tổ / Chuyền sản xuất (Dùng để phân nhóm công nhân & in phiếu lương K80/A4 hàng loạt)
   */
  static async listProductionTeams(
    branchContext: BranchFilterContext,
    filters?: { branchId?: string; departmentId?: string }
  ) {
    const where: Prisma.ProductionTeamWhereInput = {};
    if (branchContext.isAllBranches) {
      if (filters?.branchId) where.branchId = filters.branchId;
    } else {
      where.branchId =
        filters?.branchId && branchContext.allowedBranchIds.includes(filters.branchId)
          ? filters.branchId
          : { in: branchContext.allowedBranchIds };
    }

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    return prisma.productionTeam.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { code: 'asc' }],
      include: PRODUCTION_TEAM_SUMMARY_INCLUDE,
    });
  }

  static async createProductionTeam(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      departmentId: string;
      code: string;
      name: string;
      leaderName?: string;
      description?: string;
    },
    ipAddress?: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(input.branchId)
    ) {
      throw new AppError(
        'Không có quyền tạo Tổ / Chuyền tại Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const team = await prisma.productionTeam.create({
      data: {
        ...input,
        code: input.code.trim().toUpperCase(),
      },
      include: PRODUCTION_TEAM_SUMMARY_INCLUDE,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: team.branchId,
      action: 'PRODUCTION_TEAM_CREATED',
      module: 'ORGANIZATION',
      targetId: team.id,
      ipAddress,
      newValues: team,
    });

    return team;
  }
}
