

import { Prisma } from '@prisma/client';

export const BRANCH_SUMMARY_INCLUDE = {
  _count: {
    select: {
      departments: true,
      productionTeams: true,
      users: true,
      employees: true,
    },
  },
} satisfies Prisma.BranchInclude;

export const DEPARTMENT_SUMMARY_INCLUDE = {
  branch: {
    select: { id: true, code: true, name: true, type: true },
  },
  _count: {
    select: {
      productionTeams: true,
      employees: true,
    },
  },
} satisfies Prisma.DepartmentInclude;

export const PRODUCTION_TEAM_SUMMARY_INCLUDE = {
  branch: {
    select: { id: true, code: true, name: true },
  },
  department: {
    select: { id: true, code: true, name: true },
  },
  _count: {
    select: {
      employees: true,
    },
  },
} satisfies Prisma.ProductionTeamInclude;
