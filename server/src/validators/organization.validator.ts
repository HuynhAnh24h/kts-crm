import { z } from 'zod';
import { BranchType } from '@prisma/client';

export const createBranchSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(30),
    name: z.string().min(2).max(100),
    type: z.nativeEnum(BranchType).default(BranchType.FACTORY),
    subnetCidr: z.string().optional(),
    officeVlanCidr: z.string().optional(),
    iotVlanCidr: z.string().optional(),
    warpTunnelId: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const createDepartmentSchema = z.object({
  body: z.object({
    branchId: z.string().uuid(),
    code: z.string().min(2).max(30),
    name: z.string().min(2).max(100),
    nasSharePath: z.string().optional(),
    adGroupDn: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const createProductionTeamSchema = z.object({
  body: z.object({
    branchId: z.string().uuid(),
    departmentId: z.string().uuid(),
    code: z.string().min(2).max(40),
    name: z.string().min(2).max(100),
    leaderName: z.string().optional(),
    description: z.string().optional(),
  }),
});
