import { Prisma, User } from '@prisma/client';
import { ROLE_DEFINITIONS, resolveEffectivePermissions } from '../config/permissions';
import { BranchFilterContext } from '../types/express';

export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  username: true,
  role: true,
  dataScope: true,
  branchId: true,
  allowedBranchIds: true,
  customPermissions: true,
  revokedPermissions: true,
  status: true,
  twoFactorEnabled: true,
  twoFactorEmail: true,
  adLdapDn: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
    },
  },
  employee: {
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      positionTitle: true,
      employeeType: true,
      department: {
        select: { id: true, code: true, name: true },
      },
      productionTeam: {
        select: { id: true, code: true, name: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

export const buildUserBranchScopeWhere = (
  branchContext: BranchFilterContext,
  requestedBranchId?: string
): Prisma.UserWhereInput => {
  if (branchContext.isAllBranches) {
    return requestedBranchId ? { branchId: requestedBranchId } : {};
  }

  if (requestedBranchId && branchContext.allowedBranchIds.includes(requestedBranchId)) {
    return { branchId: requestedBranchId };
  }

  return {
    branchId: { in: branchContext.allowedBranchIds },
  };
};

export const formatUserWithEffectiveRbac = (
  user: Pick<
    User,
    'role' | 'customPermissions' | 'revokedPermissions'
  > &
    Record<string, unknown>
) => {
  const roleDef = ROLE_DEFINITIONS[user.role];
  const effectivePermissions = resolveEffectivePermissions(
    user.role,
    user.customPermissions,
    user.revokedPermissions
  );

  return {
    ...user,
    roleInfo: {
      code: roleDef.code,
      name: roleDef.name,
      nasFolderGroup: roleDef.nasFolderGroup,
    },
    effectivePermissions,
  };
};
