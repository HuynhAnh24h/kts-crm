import {
  Prisma,
  PurchaseStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';
import { prisma } from '../config/database';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

export class ErpModulesService {
  private static buildBranchWhere(
    branchContext: BranchFilterContext,
    requestedBranchId?: string
  ): { branchId?: string | { in: string[] } } {
    if (branchContext.isAllBranches) {
      return requestedBranchId ? { branchId: requestedBranchId } : {};
    }
    if (
      requestedBranchId &&
      branchContext.allowedBranchIds.includes(requestedBranchId)
    ) {
      return { branchId: requestedBranchId };
    }
    return { branchId: { in: branchContext.allowedBranchIds } };
  }

  private static assertBranchWrite(
    branchContext: BranchFilterContext,
    targetBranchId: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(targetBranchId)
    ) {
      throw new AppError(
        'Bạn chỉ được phép thao tác dữ liệu thuộc Chi nhánh của mình',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }
  }

  // ============================================================================
  // 1. EXECUTIVE DASHBOARD ANALYTICS
  // ============================================================================

  static async getDashboardAnalytics(
    branchContext: BranchFilterContext,
    branchId?: string
  ) {
    const branchWhere = this.buildBranchWhere(branchContext, branchId);

    const [
      branches,
      totalEmployees,
      officeStaffCount,
      factoryWorkerCount,
      activeContractsCount,
      tasks,
      productionPlans,
      purchaseRequests,
      customersCount,
      recentAuditLogs,
      payrolls,
    ] = await Promise.all([
      prisma.branch.findMany({
        where: branchContext.isAllBranches
          ? {}
          : { id: { in: branchContext.allowedBranchIds } },
        include: {
          _count: {
            select: {
              departments: true,
              productionTeams: true,
              employees: true,
              users: true,
            },
          },
        },
        orderBy: { type: 'asc' },
      }),
      prisma.employee.count({ where: branchWhere }),
      prisma.employee.count({
        where: { ...branchWhere, employeeType: 'OFFICE_STAFF' },
      }),
      prisma.employee.count({
        where: { ...branchWhere, employeeType: 'FACTORY_WORKER' },
      }),
      prisma.contract.count({
        where: { status: 'ACTIVE', employee: branchWhere },
      }),
      prisma.officeTask.findMany({
        where: branchWhere,
        select: { id: true, status: true, priority: true },
      }),
      prisma.productionPlan.findMany({
        where: branchWhere,
        include: {
          branch: { select: { code: true, name: true } },
          productionTeam: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.purchaseRequest.findMany({
        where: branchWhere,
        select: { id: true, status: true, totalEstimatedAmount: true },
      }),
      prisma.customer.count({ where: branchWhere }),
      prisma.auditLog.findMany({
        where: branchWhere,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          user: { select: { username: true, email: true, role: true } },
          branch: { select: { code: true, name: true } },
        },
      }),
      prisma.payroll.findMany({
        where: { ...branchWhere, month: 11, year: 2026 },
        select: { netPay: true, grossSalary: true, status: true },
      }),
    ]);

    const taskBreakdown = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      review: tasks.filter((t) => t.status === 'REVIEW').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    };

    const purchasingBreakdown = {
      totalRequests: purchaseRequests.length,
      pendingApproval: purchaseRequests.filter(
        (p) => p.status === 'PENDING_APPROVAL'
      ).length,
      approved: purchaseRequests.filter(
        (p) =>
          p.status === 'APPROVED' ||
          p.status === 'ORDERED' ||
          p.status === 'RECEIVED'
      ).length,
      totalEstimatedValue: purchaseRequests.reduce(
        (sum, p) => sum + Number(p.totalEstimatedAmount),
        0
      ),
    };

    const payrollSummary = {
      headcount: payrolls.length,
      totalNetPay: payrolls.reduce((s, p) => s + Number(p.netPay), 0),
      totalGross: payrolls.reduce((s, p) => s + Number(p.grossSalary), 0),
    };

    return {
      branches,
      hrMetrics: {
        totalEmployees,
        officeStaffCount,
        factoryWorkerCount,
        activeContractsCount,
        customersCount,
      },
      taskBreakdown,
      productionPlans,
      purchasingBreakdown,
      payrollSummary,
      recentAuditLogs,
    };
  }

  // ============================================================================
  // 2. CÔNG VIỆC VĂN PHÒNG (OFFICE TASKS - KANBAN)
  // ============================================================================

  static async listTasks(
    branchContext: BranchFilterContext,
    query: {
      branchId?: string;
      departmentId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      search?: string;
    }
  ) {
    const where: Prisma.OfficeTaskWhereInput = {
      ...this.buildBranchWhere(branchContext, query.branchId),
    };

    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.officeTask.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        assignee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            positionTitle: true,
          },
        },
        creator: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
          },
        },
      },
    });
  }

  static async createTask(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      departmentId: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      assigneeId?: string;
    },
    ipAddress?: string
  ) {
    this.assertBranchWrite(branchContext, input.branchId);

    let creatorEmpId = actor.employeeId;
    if (!creatorEmpId) {
      const fallbackEmp = await prisma.employee.findFirst({
        where: { branchId: input.branchId },
      });
      if (!fallbackEmp) {
        throw new AppError(
          'Cần có ít nhất 1 hồ sơ nhân sự trong chi nhánh để tạo công việc',
          400,
          'NO_EMPLOYEE_FOUND'
        );
      }
      creatorEmpId = fallbackEmp.id;
    }

    const code = `TASK-${Date.now().toString().slice(-6)}`;

    const created = await prisma.officeTask.create({
      data: {
        code,
        branchId: input.branchId,
        departmentId: input.departmentId,
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'MEDIUM',
        status: 'TODO',
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        assigneeId: input.assigneeId || null,
        creatorId: creatorEmpId,
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        assignee: { select: { id: true, employeeCode: true, fullName: true } },
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: created.branchId,
      action: 'OFFICE_TASK_CREATED',
      module: 'TASKS',
      targetId: created.id,
      ipAddress,
      newValues: { code: created.code, title: created.title },
    });

    return created;
  }

  static async updateTaskStatus(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    taskId: string,
    input: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string | null;
      title?: string;
    },
    ipAddress?: string
  ) {
    const existing = await prisma.officeTask.findUnique({ where: { id: taskId } });
    if (!existing) {
      throw new AppError('Công việc không tồn tại', 404, 'TASK_NOT_FOUND');
    }

    this.assertBranchWrite(branchContext, existing.branchId);

    const updated = await prisma.officeTask.update({
      where: { id: taskId },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.title ? { title: input.title } : {}),
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: existing.branchId,
      action: 'OFFICE_TASK_UPDATED',
      module: 'TASKS',
      targetId: updated.id,
      ipAddress,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
    });

    return updated;
  }

  // ============================================================================
  // 3. KẾ HOẠCH SẢN XUẤT THEO TỔ / CHUYỀN (PRODUCTION PLANS)
  // ============================================================================

  static async listProductionPlans(
    branchContext: BranchFilterContext,
    query: {
      branchId?: string;
      productionTeamId?: string;
      status?: TaskStatus;
    }
  ) {
    const where: Prisma.ProductionPlanWhereInput = {
      ...this.buildBranchWhere(branchContext, query.branchId),
    };

    if (query.productionTeamId) where.productionTeamId = query.productionTeamId;
    if (query.status) where.status = query.status;

    return prisma.productionPlan.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        productionTeam: {
          select: {
            id: true,
            code: true,
            name: true,
            leaderName: true,
            _count: { select: { employees: true } },
          },
        },
      },
    });
  }

  static async createProductionPlan(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      planCode?: string;
      branchId: string;
      productionTeamId: string;
      productName: string;
      targetQuantity: number;
      startDate: string;
      endDate: string;
      notes?: string;
    },
    ipAddress?: string
  ) {
    this.assertBranchWrite(branchContext, input.branchId);

    const planCode =
      input.planCode?.trim().toUpperCase() ||
      `LSX-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const created = await prisma.productionPlan.create({
      data: {
        planCode,
        branchId: input.branchId,
        productionTeamId: input.productionTeamId,
        productName: input.productName,
        targetQuantity: Number(input.targetQuantity),
        completedQuantity: 0,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: 'IN_PROGRESS',
        notes: input.notes,
      },
      include: {
        branch: { select: { code: true, name: true } },
        productionTeam: { select: { code: true, name: true } },
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: created.branchId,
      action: 'PRODUCTION_PLAN_CREATED',
      module: 'PRODUCTION',
      targetId: created.id,
      ipAddress,
      newValues: created,
    });

    return created;
  }

  static async updateProductionPlanProgress(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    planId: string,
    input: {
      completedQuantity: number;
      status?: TaskStatus;
      notes?: string;
    },
    ipAddress?: string
  ) {
    const existing = await prisma.productionPlan.findUnique({
      where: { id: planId },
    });
    if (!existing) {
      throw new AppError('Kế hoạch sản xuất không tồn tại', 404, 'PLAN_NOT_FOUND');
    }

    this.assertBranchWrite(branchContext, existing.branchId);

    const completed = Number(input.completedQuantity);
    const autoStatus: TaskStatus =
      input.status ??
      (completed >= existing.targetQuantity
        ? 'COMPLETED'
        : completed > 0
        ? 'IN_PROGRESS'
        : 'TODO');

    const updated = await prisma.productionPlan.update({
      where: { id: planId },
      data: {
        completedQuantity: completed,
        status: autoStatus,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: existing.branchId,
      action: 'PRODUCTION_PLAN_PROGRESS_UPDATED',
      module: 'PRODUCTION',
      targetId: updated.id,
      ipAddress,
      oldValues: { completedQuantity: existing.completedQuantity },
      newValues: { completedQuantity: updated.completedQuantity, status: updated.status },
    });

    return updated;
  }

  // ============================================================================
  // 4. BỘ PHẬN THU MUA & PHÊ DUYỆT VẬT TƯ (PURCHASING WORKFLOW)
  // ============================================================================

  static async listPurchaseRequests(
    branchContext: BranchFilterContext,
    query: {
      branchId?: string;
      status?: PurchaseStatus;
    }
  ) {
    const where: Prisma.PurchaseRequestWhereInput = {
      ...this.buildBranchWhere(branchContext, query.branchId),
    };

    if (query.status) where.status = query.status;

    return prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        requester: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            positionTitle: true,
          },
        },
      },
    });
  }

  static async createPurchaseRequest(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      departmentId: string;
      title: string;
      supplierName?: string;
      items: Array<{
        itemName: string;
        unit: string;
        quantity: number;
        unitPrice: number;
      }>;
    },
    ipAddress?: string
  ) {
    this.assertBranchWrite(branchContext, input.branchId);

    let requesterId = actor.employeeId;
    if (!requesterId) {
      const fallbackEmp = await prisma.employee.findFirst({
        where: { branchId: input.branchId },
      });
      if (!fallbackEmp) {
        throw new AppError('Không tìm thấy hồ sơ người đề xuất', 400, 'NO_REQUESTER');
      }
      requesterId = fallbackEmp.id;
    }

    const totalEstimatedAmount = (input.items || []).reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );

    const requestCode = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const created = await prisma.purchaseRequest.create({
      data: {
        requestCode,
        branchId: input.branchId,
        departmentId: input.departmentId,
        requesterId,
        title: input.title,
        supplierName: input.supplierName || 'Nhà cung cấp nội địa',
        totalEstimatedAmount,
        itemsJson: input.items as unknown as Prisma.InputJsonValue,
        status: 'PENDING_APPROVAL',
      },
      include: {
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        requester: { select: { employeeCode: true, fullName: true } },
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: created.branchId,
      action: 'PURCHASE_REQUEST_CREATED',
      module: 'PURCHASING',
      targetId: created.id,
      ipAddress,
      newValues: {
        requestCode: created.requestCode,
        title: created.title,
        totalEstimatedAmount,
      },
    });

    return created;
  }

  static async updatePurchaseStatus(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    requestId: string,
    status: PurchaseStatus,
    ipAddress?: string
  ) {
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id: requestId },
    });
    if (!existing) {
      throw new AppError('Đơn đề nghị thu mua không tồn tại', 404, 'PO_NOT_FOUND');
    }

    this.assertBranchWrite(branchContext, existing.branchId);

    const updated = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(status === 'APPROVED'
          ? { approvedByUserId: actor.id, approvedAt: new Date() }
          : {}),
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: existing.branchId,
      action: `PURCHASE_REQUEST_${status}`,
      module: 'PURCHASING',
      targetId: updated.id,
      ipAddress,
      oldValues: { status: existing.status },
      newValues: { status: updated.status },
    });

    return updated;
  }

  // ============================================================================
  // 5. KHÁCH HÀNG & BỘ PHẬN KINH DOANH (SALES CUSTOMERS)
  // ============================================================================

  static async listCustomers(
    branchContext: BranchFilterContext,
    query: { branchId?: string; search?: string }
  ) {
    const where: Prisma.CustomerWhereInput = {
      ...this.buildBranchWhere(branchContext, query.branchId),
    };

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { companyName: { contains: q, mode: 'insensitive' } },
        { customerCode: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        assignedEmployee: {
          select: { id: true, employeeCode: true, fullName: true },
        },
      },
    });
  }

  static async createCustomer(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      customerCode?: string;
      branchId: string;
      companyName: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      taxCode?: string;
      address?: string;
      notes?: string;
    },
    ipAddress?: string
  ) {
    this.assertBranchWrite(branchContext, input.branchId);

    const customerCode =
      input.customerCode?.trim().toUpperCase() ||
      `KH-${Date.now().toString().slice(-5)}`;

    const created = await prisma.customer.create({
      data: {
        customerCode,
        branchId: input.branchId,
        assignedEmployeeId: actor.employeeId ?? null,
        companyName: input.companyName,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        taxCode: input.taxCode,
        address: input.address,
        notes: input.notes,
      },
      include: {
        branch: { select: { code: true, name: true } },
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: created.branchId,
      action: 'CUSTOMER_CREATED',
      module: 'CUSTOMERS',
      targetId: created.id,
      ipAddress,
      newValues: { customerCode: created.customerCode, companyName: created.companyName },
    });

    return created;
  }
}
