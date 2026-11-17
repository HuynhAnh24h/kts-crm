import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { BranchFilterContext } from '../types/express';

export interface CreateAuditLogInput {
  userId?: string | null;
  branchId?: string | null;
  action: string;
  module: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
}

export class AuditService {
  static async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          branchId: input.branchId ?? null,
          action: input.action,
          module: input.module,
          targetId: input.targetId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          oldValues: (input.oldValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          newValues: (input.newValues as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      console.error('⚠️ Failed to write AuditLog:', error);
    }
  }

  static async listAuditLogs(
    branchContext: BranchFilterContext,
    query: {
      page?: number;
      limit?: number;
      branchId?: string;
      module?: string;
      userId?: string;
    }
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (!branchContext.isAllBranches) {
      where.branchId = { in: branchContext.allowedBranchIds };
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.module) {
      where.module = query.module;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, email: true, role: true },
          },
          branch: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
