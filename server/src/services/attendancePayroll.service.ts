import { PayrollStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

export class AttendancePayrollService {
  /**
   * Kiểm tra quyền thao tác trên Chi nhánh mục tiêu
   */
  private static assertBranchScope(
    branchContext: BranchFilterContext,
    targetBranchId: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(targetBranchId)
    ) {
      throw new AppError(
        'Truy cập bị từ chối: Bạn chỉ được phép thao tác công và lương trong phạm vi Chi nhánh của mình',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }
  }

  /**
   * 1. Danh sách Bảng Tổng Hợp Công theo Tháng/Năm & Chi nhánh/Phòng ban/Tổ chuyền
   */
  static async listAttendance(
    viewer: AuthenticatedUser,
    branchContext: BranchFilterContext,
    query: {
      branchId?: string;
      departmentId?: string;
      productionTeamId?: string;
      month?: number;
      year?: number;
      isLocked?: boolean;
      search?: string;
    }
  ) {
    const month = Number(query.month) || new Date().getMonth() + 1;
    const year = Number(query.year) || new Date().getFullYear();

    const where: Prisma.AttendanceSummaryWhereInput = {
      month,
      year,
    };

    if (viewer.dataScope === 'SELF') {
      where.employeeId = branchContext.selfEmployeeId ?? '__NONE__';
    } else if (branchContext.isAllBranches) {
      if (query.branchId) where.branchId = query.branchId;
    } else {
      where.branchId =
        query.branchId && branchContext.allowedBranchIds.includes(query.branchId)
          ? query.branchId
          : { in: branchContext.allowedBranchIds };
    }

    if (query.isLocked !== undefined) {
      where.isLocked = query.isLocked;
    }

    const empFilter: Prisma.EmployeeWhereInput = {};
    if (query.departmentId) empFilter.departmentId = query.departmentId;
    if (query.productionTeamId) empFilter.productionTeamId = query.productionTeamId;
    if (query.search) {
      const q = query.search.trim();
      empFilter.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(empFilter).length > 0) {
      where.employee = empFilter;
    }

    const items = await prisma.attendanceSummary.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { employee: { employeeCode: 'asc' } }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            positionTitle: true,
            employeeType: true,
            department: { select: { id: true, code: true, name: true } },
            productionTeam: { select: { id: true, code: true, name: true } },
            contracts: {
              where: { status: 'ACTIVE' },
              orderBy: { startDate: 'desc' },
              take: 1,
            },
          },
        },
        payroll: {
          select: {
            id: true,
            netPay: true,
            status: true,
          },
        },
      },
    });

    const summaryStats = {
      totalEmployees: items.length,
      lockedCount: items.filter((i) => i.isLocked).length,
      unlockedCount: items.filter((i) => !i.isLocked).length,
      totalOvertimeHours: items.reduce(
        (acc, i) =>
          acc +
          Number(i.overtimeHoursNormal) +
          Number(i.overtimeHoursWeekend) +
          Number(i.overtimeHoursHoliday),
        0
      ),
    };

    return { items, summaryStats, month, year };
  }

  /**
   * 2. Khởi tạo Bảng chấm công tháng cho toàn bộ nhân sự đang làm việc tại Chi nhánh
   */
  static async initializeMonthlyAttendance(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      month: number;
      year: number;
      standardWorkDays?: number;
    },
    ipAddress?: string
  ) {
    this.assertBranchScope(branchContext, input.branchId);

    const activeEmployees = await prisma.employee.findMany({
      where: {
        branchId: input.branchId,
        employmentStatus: { in: ['OFFICIAL', 'PROBATION'] },
      },
    });

    let createdCount = 0;
    const stdDays = input.standardWorkDays ?? 26;

    for (const emp of activeEmployees) {
      const existing = await prisma.attendanceSummary.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: input.month,
            year: input.year,
          },
        },
      });

      if (!existing) {
        await prisma.attendanceSummary.create({
          data: {
            employeeId: emp.id,
            branchId: emp.branchId,
            month: input.month,
            year: input.year,
            standardWorkDays: stdDays,
            actualWorkDays: stdDays,
            paidLeaveDays: 0,
            unpaidLeaveDays: 0,
            overtimeHoursNormal: emp.employeeType === 'FACTORY_WORKER' ? 12 : 0,
            overtimeHoursWeekend: 0,
            overtimeHoursHoliday: 0,
            lateMinutes: 0,
            isLocked: false,
          },
        });
        createdCount++;
      }
    }

    await AuditService.log({
      userId: actor.id,
      branchId: input.branchId,
      action: 'ATTENDANCE_MONTH_INITIALIZED',
      module: 'ATTENDANCE',
      ipAddress,
      metadata: {
        month: input.month,
        year: input.year,
        totalActiveEmployees: activeEmployees.length,
        createdCount,
      },
    });

    return {
      branchId: input.branchId,
      month: input.month,
      year: input.year,
      totalActiveEmployees: activeEmployees.length,
      createdCount,
    };
  }

  /**
   * 3. HR Cập nhật chi tiết ngày công & giờ tăng ca của 1 nhân viên (Chỉ khi chưa khóa công)
   */
  static async updateAttendanceRecord(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    recordId: string,
    input: {
      standardWorkDays?: number;
      actualWorkDays: number;
      paidLeaveDays?: number;
      unpaidLeaveDays?: number;
      overtimeHoursNormal?: number;
      overtimeHoursWeekend?: number;
      overtimeHoursHoliday?: number;
      lateMinutes?: number;
    },
    ipAddress?: string
  ) {
    const existing = await prisma.attendanceSummary.findUnique({
      where: { id: recordId },
      include: { employee: { select: { employeeCode: true, fullName: true } } },
    });

    if (!existing) {
      throw new AppError('Bản ghi chấm công không tồn tại', 404, 'ATTENDANCE_NOT_FOUND');
    }

    this.assertBranchScope(branchContext, existing.branchId);

    if (existing.isLocked) {
      throw new AppError(
        'Bảng công của nhân viên này đã bị KHÓA. Vui lòng mở khóa công trước khi chỉnh sửa.',
        400,
        'ATTENDANCE_ALREADY_LOCKED'
      );
    }

    const updated = await prisma.attendanceSummary.update({
      where: { id: recordId },
      data: {
        ...(input.standardWorkDays !== undefined
          ? { standardWorkDays: input.standardWorkDays }
          : {}),
        actualWorkDays: input.actualWorkDays,
        paidLeaveDays: input.paidLeaveDays ?? 0,
        unpaidLeaveDays: input.unpaidLeaveDays ?? 0,
        overtimeHoursNormal: input.overtimeHoursNormal ?? 0,
        overtimeHoursWeekend: input.overtimeHoursWeekend ?? 0,
        overtimeHoursHoliday: input.overtimeHoursHoliday ?? 0,
        lateMinutes: input.lateMinutes ?? 0,
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: existing.branchId,
      action: 'ATTENDANCE_RECORD_UPDATED',
      module: 'ATTENDANCE',
      targetId: updated.id,
      ipAddress,
      oldValues: {
        actualWorkDays: existing.actualWorkDays,
        overtimeHoursNormal: existing.overtimeHoursNormal,
      },
      newValues: input,
    });

    return updated;
  }

  /**
   * 4. Khóa công / Mở khóa công hàng loạt theo Chi nhánh hoặc Tổ/Chuyền
   * (Chốt công để chuyển sang bộ phận Kế toán tính lương)
   */
  static async batchLockUnlockAttendance(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      productionTeamId?: string;
      month: number;
      year: number;
      lock: boolean;
    },
    ipAddress?: string
  ) {
    this.assertBranchScope(branchContext, input.branchId);

    const where: Prisma.AttendanceSummaryWhereInput = {
      branchId: input.branchId,
      month: input.month,
      year: input.year,
      ...(input.productionTeamId
        ? { employee: { productionTeamId: input.productionTeamId } }
        : {}),
    };

    const result = await prisma.attendanceSummary.updateMany({
      where,
      data: {
        isLocked: input.lock,
        lockedAt: input.lock ? new Date() : null,
        lockedByUserId: input.lock ? actor.id : null,
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: input.branchId,
      action: input.lock ? 'ATTENDANCE_BATCH_LOCKED' : 'ATTENDANCE_BATCH_UNLOCKED',
      module: 'ATTENDANCE',
      ipAddress,
      metadata: {
        month: input.month,
        year: input.year,
        productionTeamId: input.productionTeamId ?? 'ALL_TEAMS',
        affectedCount: result.count,
      },
    });

    return {
      affectedCount: result.count,
      isLocked: input.lock,
    };
  }

  /**
   * 5. Danh sách Bảng Lương theo Tháng/Năm & Chi nhánh/Phòng ban/Tổ chuyền
   */
  static async listPayrolls(
    viewer: AuthenticatedUser,
    branchContext: BranchFilterContext,
    query: {
      branchId?: string;
      departmentId?: string;
      productionTeamId?: string;
      month?: number;
      year?: number;
      search?: string;
    }
  ) {
    const month = Number(query.month) || new Date().getMonth() + 1;
    const year = Number(query.year) || new Date().getFullYear();

    const where: Prisma.PayrollWhereInput = {
      month,
      year,
    };

    if (viewer.dataScope === 'SELF') {
      where.employeeId = branchContext.selfEmployeeId ?? '__NONE__';
    } else if (branchContext.isAllBranches) {
      if (query.branchId) where.branchId = query.branchId;
    } else {
      where.branchId =
        query.branchId && branchContext.allowedBranchIds.includes(query.branchId)
          ? query.branchId
          : { in: branchContext.allowedBranchIds };
    }

    if (query.productionTeamId) {
      where.productionTeamId = query.productionTeamId;
    }

    const empFilter: Prisma.EmployeeWhereInput = {};
    if (query.departmentId) empFilter.departmentId = query.departmentId;
    if (query.search) {
      const q = query.search.trim();
      empFilter.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(empFilter).length > 0) {
      where.employee = empFilter;
    }

    const items = await prisma.payroll.findMany({
      where,
      orderBy: [{ branchId: 'asc' }, { employee: { employeeCode: 'asc' } }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        productionTeam: { select: { id: true, code: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            positionTitle: true,
            employeeType: true,
            bankAccountNumber: true,
            bankName: true,
            department: { select: { id: true, code: true, name: true } },
          },
        },
        attendanceSummary: true,
      },
    });

    const financialSummary = {
      totalEmployees: items.length,
      totalGrossSalary: items.reduce((s, i) => s + Number(i.grossSalary), 0),
      totalOvertimePay: items.reduce((s, i) => s + Number(i.overtimePay), 0),
      totalDeductions: items.reduce(
        (s, i) =>
          s +
          Number(i.insuranceDeduction) +
          Number(i.taxDeduction) +
          Number(i.advanceDeduction) +
          Number(i.otherDeduction),
        0
      ),
      totalNetPay: items.reduce((s, i) => s + Number(i.netPay), 0),
      approvedCount: items.filter((i) => i.status === 'APPROVED' || i.status === 'PAID')
        .length,
    };

    return { items, financialSummary, month, year };
  }

  /**
   * 6. Kế toán chạy Tính Lương Tự Động từ (Công Đã Khóa + Hợp Đồng Lao Động đang hiệu lực)
   */
  static async calculateBatchPayroll(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      productionTeamId?: string;
      month: number;
      year: number;
    },
    ipAddress?: string
  ) {
    this.assertBranchScope(branchContext, input.branchId);

    const lockedAttendances = await prisma.attendanceSummary.findMany({
      where: {
        branchId: input.branchId,
        month: input.month,
        year: input.year,
        isLocked: true,
        ...(input.productionTeamId
          ? { employee: { productionTeamId: input.productionTeamId } }
          : {}),
      },
      include: {
        employee: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              orderBy: { startDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (lockedAttendances.length === 0) {
      throw new AppError(
        'Không tìm thấy bản ghi công nào ĐÃ KHÓA trong kỳ này. Vui lòng yêu cầu Nhân sự (HR) Khóa công trước khi tính lương.',
        400,
        'NO_LOCKED_ATTENDANCE_FOUND'
      );
    }

    let calculatedCount = 0;

    for (const att of lockedAttendances) {
      const activeContract = att.employee.contracts[0];
      const baseSalary = activeContract ? Number(activeContract.baseSalary) : 8000000;
      const insuranceSalary = activeContract
        ? Number(activeContract.insuranceSalary)
        : baseSalary * 0.8;

      const totalAllowances = activeContract
        ? Number(activeContract.positionAllowance) +
          Number(activeContract.mealAllowance) +
          Number(activeContract.transportAllowance) +
          Number(activeContract.otherAllowance)
        : 730000;

      const stdDays = Number(att.standardWorkDays) || 26;
      const paidDays = Number(att.actualWorkDays) + Number(att.paidLeaveDays);

      // Lương ngày công thực tế
      const dailyRate = baseSalary / stdDays;
      const workDaySalary = Math.round(dailyRate * paidDays);

      // Lương giờ tăng ca: Thường 150%, Cuối tuần 200%, Lễ 300%
      const hourlyRate = dailyRate / 8;
      const otNormal = Number(att.overtimeHoursNormal);
      const otWeekend = Number(att.overtimeHoursWeekend);
      const otHoliday = Number(att.overtimeHoursHoliday);
      const totalOvertimeHours = otNormal + otWeekend + otHoliday;

      const overtimePay = Math.round(
        hourlyRate * (otNormal * 1.5 + otWeekend * 2.0 + otHoliday * 3.0)
      );

      // Kiểm tra xem đã có bản ghi lương trước đó để giữ lại Thưởng / Tạm ứng nếu có
      const existingPayroll = await prisma.payroll.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: att.employeeId,
            month: input.month,
            year: input.year,
          },
        },
      });

      if (existingPayroll && existingPayroll.status === 'PAID') {
        continue; // Không ghi đè phiếu lương đã thanh toán
      }

      const bonus = existingPayroll ? Number(existingPayroll.bonus) : 0;
      const advanceDeduction = existingPayroll
        ? Number(existingPayroll.advanceDeduction)
        : 0;
      const otherDeduction = existingPayroll ? Number(existingPayroll.otherDeduction) : 0;

      // Khấu trừ BHXH 10.5% (8% BHXH + 1.5% BHYT + 1% BHTN)
      const insuranceDeduction = Math.round(insuranceSalary * 0.105);

      const grossSalary = workDaySalary + overtimePay + totalAllowances + bonus;

      // Thuế TNCN tạm tính cho phần thu nhập chịu thuế vượt 11 triệu
      const taxableIncome = Math.max(0, grossSalary - insuranceDeduction - 11000000);
      const taxDeduction = existingPayroll
        ? Number(existingPayroll.taxDeduction)
        : Math.round(taxableIncome * 0.05);

      const netPay = Math.max(
        0,
        grossSalary - insuranceDeduction - taxDeduction - advanceDeduction - otherDeduction
      );

      await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: att.employeeId,
            month: input.month,
            year: input.year,
          },
        },
        update: {
          productionTeamId: att.employee.productionTeamId,
          attendanceSummaryId: att.id,
          baseSalary,
          workDaySalary,
          totalOvertimeHours,
          overtimePay,
          totalAllowances,
          bonus,
          grossSalary,
          insuranceDeduction,
          taxDeduction,
          advanceDeduction,
          otherDeduction,
          netPay,
          status: 'CALCULATED',
        },
        create: {
          employeeId: att.employeeId,
          branchId: att.branchId,
          productionTeamId: att.employee.productionTeamId,
          attendanceSummaryId: att.id,
          month: input.month,
          year: input.year,
          baseSalary,
          workDaySalary,
          totalOvertimeHours,
          overtimePay,
          totalAllowances,
          bonus,
          grossSalary,
          insuranceDeduction,
          taxDeduction,
          advanceDeduction,
          otherDeduction,
          netPay,
          status: 'CALCULATED',
        },
      });

      calculatedCount++;
    }

    await AuditService.log({
      userId: actor.id,
      branchId: input.branchId,
      action: 'PAYROLL_BATCH_CALCULATED',
      module: 'PAYROLL',
      ipAddress,
      metadata: {
        month: input.month,
        year: input.year,
        calculatedCount,
      },
    });

    return {
      month: input.month,
      year: input.year,
      calculatedCount,
    };
  }

  /**
   * 7. Kế toán điều chỉnh Thưởng / Tạm ứng / Khấu trừ trên từng phiếu lương
   */
  static async updatePayrollAdjustments(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    payrollId: string,
    input: {
      bonus: number;
      advanceDeduction: number;
      taxDeduction: number;
      otherDeduction: number;
    },
    ipAddress?: string
  ) {
    const existing = await prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!existing) {
      throw new AppError('Bảng lương không tồn tại', 404, 'PAYROLL_NOT_FOUND');
    }

    this.assertBranchScope(branchContext, existing.branchId);

    if (existing.status === 'PAID') {
      throw new AppError(
        'Phiếu lương đã được xác nhận thanh toán (PAID), không thể chỉnh sửa',
        400,
        'PAYROLL_ALREADY_PAID'
      );
    }

    const grossSalary =
      Number(existing.workDaySalary) +
      Number(existing.overtimePay) +
      Number(existing.totalAllowances) +
      Number(input.bonus);

    const netPay = Math.max(
      0,
      grossSalary -
        Number(existing.insuranceDeduction) -
        Number(input.taxDeduction) -
        Number(input.advanceDeduction) -
        Number(input.otherDeduction)
    );

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        bonus: input.bonus,
        advanceDeduction: input.advanceDeduction,
        taxDeduction: input.taxDeduction,
        otherDeduction: input.otherDeduction,
        grossSalary,
        netPay,
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: existing.branchId,
      action: 'PAYROLL_ADJUSTMENT_UPDATED',
      module: 'PAYROLL',
      targetId: updated.id,
      ipAddress,
      newValues: { ...input, grossSalary, netPay },
    });

    return updated;
  }

  /**
   * 8. Kế toán trưởng / Giám đốc Phê duyệt bảng lương (`APPROVED`) hoặc Xác nhận Đã chi (`PAID`)
   */
  static async updateBatchPayrollStatus(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      branchId: string;
      productionTeamId?: string;
      month: number;
      year: number;
      status: PayrollStatus;
    },
    ipAddress?: string
  ) {
    this.assertBranchScope(branchContext, input.branchId);

    const result = await prisma.payroll.updateMany({
      where: {
        branchId: input.branchId,
        month: input.month,
        year: input.year,
        ...(input.productionTeamId ? { productionTeamId: input.productionTeamId } : {}),
      },
      data: {
        status: input.status,
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: input.branchId,
      action: `PAYROLL_BATCH_STATUS_${input.status}`,
      module: 'PAYROLL',
      ipAddress,
      metadata: {
        month: input.month,
        year: input.year,
        status: input.status,
        affectedCount: result.count,
      },
    });

    return {
      affectedCount: result.count,
      status: input.status,
    };
  }
}
