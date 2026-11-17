import { Prisma } from '@prisma/client';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { PERMISSIONS } from '../config/permissions';

export const EMPLOYEE_FULL_INCLUDE = {
  branch: {
    select: { id: true, code: true, name: true, type: true },
  },
  department: {
    select: { id: true, code: true, name: true, nasSharePath: true },
  },
  productionTeam: {
    select: { id: true, code: true, name: true, leaderName: true },
  },
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      dataScope: true,
      status: true,
      twoFactorEnabled: true,
    },
  },
  contracts: {
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    take: 1,
  },
} satisfies Prisma.EmployeeInclude;

/**
 * Xây dựng bộ lọc Prisma tự động cô lập dữ liệu theo Chi nhánh / Phòng ban / Tổ chuyền / Cá nhân
 * Đúng theo kiến trúc https://tai-lieu-network.vercel.app/:
 * - PC Kế toán / HR Xưởng chỉ nhìn thấy danh sách công nhân viên thuộc Chi nhánh mình
 * - Nhân viên văn phòng / Công nhân có scope SELF chỉ xem được hồ sơ của chính mình
 */
export const buildEmployeeScopeWhere = (
  user: AuthenticatedUser,
  branchContext: BranchFilterContext,
  filters?: {
    branchId?: string;
    departmentId?: string;
    productionTeamId?: string;
  }
): Prisma.EmployeeWhereInput => {
  const where: Prisma.EmployeeWhereInput = {};

  switch (user.dataScope) {
    case 'ALL_BRANCHES':
      if (filters?.branchId) {
        where.branchId = filters.branchId;
      }
      break;

    case 'OWN_BRANCH':
      if (filters?.branchId && branchContext.allowedBranchIds.includes(filters.branchId)) {
        where.branchId = filters.branchId;
      } else {
        where.branchId = { in: branchContext.allowedBranchIds };
      }
      break;

    case 'OWN_DEPARTMENT':
      where.branchId = { in: branchContext.allowedBranchIds };
      where.departmentId = branchContext.departmentId ?? '__NONE__';
      break;

    case 'OWN_TEAM':
      where.branchId = { in: branchContext.allowedBranchIds };
      where.productionTeamId = branchContext.productionTeamId ?? '__NONE__';
      break;

    case 'SELF':
    default:
      where.id = branchContext.selfEmployeeId ?? '__NONE__';
      break;
  }

  if (filters?.departmentId && user.dataScope !== 'OWN_DEPARTMENT') {
    where.departmentId = filters.departmentId;
  }

  if (filters?.productionTeamId && user.dataScope !== 'OWN_TEAM') {
    where.productionTeamId = filters.productionTeamId;
  }

  return where;
};

/**
 * Ẩn thông tin nhạy cảm (CCCD, tài khoản ngân hàng, lương hợp đồng) nếu User không có quyền
 * `employees:read_sensitive` và không phải đang xem hồ sơ của chính mình.
 */
export const sanitizeEmployeeProfile = <
  T extends {
    id: string;
    nationalId?: string | null;
    taxCode?: string | null;
    socialInsuranceNo?: string | null;
    bankAccountNumber?: string | null;
    contracts?: unknown[];
  }
>(
  employee: T,
  viewer: AuthenticatedUser
): T => {
  const canReadSensitive =
    viewer.role === 'SUPER_ADMIN' ||
    viewer.permissions.includes(PERMISSIONS.EMPLOYEES_READ_SENSITIVE) ||
    viewer.employeeId === employee.id;

  if (canReadSensitive) {
    return employee;
  }

  return {
    ...employee,
    nationalId: employee.nationalId ? '***MASKED***' : null,
    taxCode: employee.taxCode ? '***MASKED***' : null,
    socialInsuranceNo: employee.socialInsuranceNo ? '***MASKED***' : null,
    bankAccountNumber: employee.bankAccountNumber ? '***MASKED***' : null,
    contracts: [],
  };
};
