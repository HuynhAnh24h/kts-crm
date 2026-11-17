import { PayslipFormat } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

/**
 * Thực thi Luồng 3 & Luồng 4 trong sơ đồ kiến trúc https://tai-lieu-network.vercel.app/:
 * 1. Webhook nhận dữ liệu tổng hợp công từ Phần mềm Chấm công Cloud (`POST /api/v1/external/attendance/webhook-sync`)
 * 2. API cung cấp Công đã khóa + Lương Hợp đồng cho Phần mềm Tính lương Riêng (`GET /api/v1/external/payroll/locked-attendance`)
 * 3. API nhận Bảng lương hoàn chỉnh từ Phần mềm Tính lương Riêng (`POST /api/v1/external/payroll/sync-results`)
 * 4. Xuất dữ liệu in phiếu lương hàng loạt theo Tổ / Chuyền cho máy in nhiệt K80 hoặc A4 (3 phiếu/trang)
 */
export class ExternalSyncService {
  /**
   * 1. Cloud Attendance Software đẩy dữ liệu tổng hợp công về CRM
   */
  static async syncAttendanceFromCloud(
    payload: {
      month: number;
      year: number;
      records: Array<{
        employeeCode: string;
        standardWorkDays?: number;
        actualWorkDays: number;
        paidLeaveDays?: number;
        unpaidLeaveDays?: number;
        overtimeHoursNormal?: number;
        overtimeHoursWeekend?: number;
        overtimeHoursHoliday?: number;
        lateMinutes?: number;
        lockImmediately?: boolean;
      }>;
    },
    ipAddress?: string
  ) {
    const results = [];

    for (const item of payload.records) {
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: item.employeeCode },
      });

      if (!employee) {
        results.push({ employeeCode: item.employeeCode, status: 'SKIPPED_NOT_FOUND' });
        continue;
      }

      const record = await prisma.attendanceSummary.upsert({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month: payload.month,
            year: payload.year,
          },
        },
        update: {
          standardWorkDays: item.standardWorkDays ?? 26,
          actualWorkDays: item.actualWorkDays,
          paidLeaveDays: item.paidLeaveDays ?? 0,
          unpaidLeaveDays: item.unpaidLeaveDays ?? 0,
          overtimeHoursNormal: item.overtimeHoursNormal ?? 0,
          overtimeHoursWeekend: item.overtimeHoursWeekend ?? 0,
          overtimeHoursHoliday: item.overtimeHoursHoliday ?? 0,
          lateMinutes: item.lateMinutes ?? 0,
          isLocked: item.lockImmediately ?? false,
          lockedAt: item.lockImmediately ? new Date() : undefined,
          syncedFromCloudAt: new Date(),
        },
        create: {
          employeeId: employee.id,
          branchId: employee.branchId,
          month: payload.month,
          year: payload.year,
          standardWorkDays: item.standardWorkDays ?? 26,
          actualWorkDays: item.actualWorkDays,
          paidLeaveDays: item.paidLeaveDays ?? 0,
          unpaidLeaveDays: item.unpaidLeaveDays ?? 0,
          overtimeHoursNormal: item.overtimeHoursNormal ?? 0,
          overtimeHoursWeekend: item.overtimeHoursWeekend ?? 0,
          overtimeHoursHoliday: item.overtimeHoursHoliday ?? 0,
          lateMinutes: item.lateMinutes ?? 0,
          isLocked: item.lockImmediately ?? false,
          lockedAt: item.lockImmediately ? new Date() : null,
          syncedFromCloudAt: new Date(),
        },
      });

      results.push({
        employeeCode: item.employeeCode,
        attendanceSummaryId: record.id,
        status: 'SYNCED',
      });
    }

    await AuditService.log({
      action: 'EXTERNAL_CLOUD_ATTENDANCE_WEBHOOK_SYNC',
      module: 'EXTERNAL_API',
      ipAddress,
      metadata: {
        month: payload.month,
        year: payload.year,
        syncedCount: results.filter((r) => r.status === 'SYNCED').length,
      },
    });

    return {
      month: payload.month,
      year: payload.year,
      totalReceived: payload.records.length,
      results,
    };
  }

  /**
   * 2. Phần mềm Tính lương Riêng GET danh sách Công đã khóa + Lương Hợp đồng
   */
  static async getLockedAttendanceWithContracts(query: {
    month: number;
    year: number;
    branchCode?: string;
  }) {
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        month: Number(query.month),
        year: Number(query.year),
        isLocked: true,
        ...(query.branchCode ? { branch: { code: query.branchCode } } : {}),
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            positionTitle: true,
            employeeType: true,
            productionTeam: { select: { id: true, code: true, name: true } },
            contracts: {
              where: { status: 'ACTIVE' },
              orderBy: { startDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return summaries.map((s) => ({
      attendanceSummaryId: s.id,
      month: s.month,
      year: s.year,
      branch: s.branch,
      employee: {
        id: s.employee.id,
        employeeCode: s.employee.employeeCode,
        fullName: s.employee.fullName,
        positionTitle: s.employee.positionTitle,
        employeeType: s.employee.employeeType,
        productionTeam: s.employee.productionTeam,
      },
      attendance: {
        standardWorkDays: s.standardWorkDays,
        actualWorkDays: s.actualWorkDays,
        paidLeaveDays: s.paidLeaveDays,
        unpaidLeaveDays: s.unpaidLeaveDays,
        overtimeHoursNormal: s.overtimeHoursNormal,
        overtimeHoursWeekend: s.overtimeHoursWeekend,
        overtimeHoursHoliday: s.overtimeHoursHoliday,
      },
      activeContract: s.employee.contracts[0] ?? null,
    }));
  }

  /**
   * 3. Phần mềm Tính lương Riêng POST bảng lương hoàn chỉnh ngược về CRM
   */
  static async syncCalculatedPayrollToCrm(
    payload: {
      month: number;
      year: number;
      items: Array<{
        employeeCode: string;
        baseSalary: number;
        workDaySalary: number;
        totalOvertimeHours: number;
        overtimePay: number;
        totalAllowances?: number;
        bonus?: number;
        grossSalary: number;
        insuranceDeduction?: number;
        taxDeduction?: number;
        advanceDeduction?: number;
        otherDeduction?: number;
        netPay: number;
        externalPayrollRef?: string;
      }>;
    },
    ipAddress?: string
  ) {
    const synced = [];

    for (const item of payload.items) {
      const employee = await prisma.employee.findUnique({
        where: { employeeCode: item.employeeCode },
      });

      if (!employee) continue;

      const attendance = await prisma.attendanceSummary.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month: payload.month,
            year: payload.year,
          },
        },
      });

      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month: payload.month,
            year: payload.year,
          },
        },
        update: {
          productionTeamId: employee.productionTeamId,
          attendanceSummaryId: attendance?.id ?? null,
          baseSalary: item.baseSalary,
          workDaySalary: item.workDaySalary,
          totalOvertimeHours: item.totalOvertimeHours,
          overtimePay: item.overtimePay,
          totalAllowances: item.totalAllowances ?? 0,
          bonus: item.bonus ?? 0,
          grossSalary: item.grossSalary,
          insuranceDeduction: item.insuranceDeduction ?? 0,
          taxDeduction: item.taxDeduction ?? 0,
          advanceDeduction: item.advanceDeduction ?? 0,
          otherDeduction: item.otherDeduction ?? 0,
          netPay: item.netPay,
          externalPayrollRef: item.externalPayrollRef,
          status: 'CALCULATED',
        },
        create: {
          employeeId: employee.id,
          branchId: employee.branchId,
          productionTeamId: employee.productionTeamId,
          attendanceSummaryId: attendance?.id ?? null,
          month: payload.month,
          year: payload.year,
          baseSalary: item.baseSalary,
          workDaySalary: item.workDaySalary,
          totalOvertimeHours: item.totalOvertimeHours,
          overtimePay: item.overtimePay,
          totalAllowances: item.totalAllowances ?? 0,
          bonus: item.bonus ?? 0,
          grossSalary: item.grossSalary,
          insuranceDeduction: item.insuranceDeduction ?? 0,
          taxDeduction: item.taxDeduction ?? 0,
          advanceDeduction: item.advanceDeduction ?? 0,
          otherDeduction: item.otherDeduction ?? 0,
          netPay: item.netPay,
          externalPayrollRef: item.externalPayrollRef,
          status: 'CALCULATED',
        },
      });

      synced.push({ employeeCode: item.employeeCode, payrollId: payroll.id });
    }

    await AuditService.log({
      action: 'EXTERNAL_PAYROLL_SYNC_COMPLETED',
      module: 'EXTERNAL_API',
      ipAddress,
      metadata: {
        month: payload.month,
        year: payload.year,
        syncedCount: synced.length,
      },
    });

    return {
      month: payload.month,
      year: payload.year,
      syncedCount: synced.length,
      items: synced,
    };
  }

  /**
   * 4. Xuất lệnh in Phiếu lương K80/A4 hàng loạt theo Tổ / Chuyền tại Chi nhánh/Xưởng
   * (Luồng 3 trên sơ đồ: PC Kế toán/HR Xưởng -> Máy in Phiếu lương K80/A4)
   */
  static async exportBatchPayslipsByTeam(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    params: {
      branchId: string;
      productionTeamId?: string;
      month: number;
      year: number;
      format: PayslipFormat;
    },
    ipAddress?: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(params.branchId)
    ) {
      throw new AppError(
        'Kế toán / HR Xưởng chỉ được phép in phiếu lương thuộc Chi nhánh của mình',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const payrolls = await prisma.payroll.findMany({
      where: {
        branchId: params.branchId,
        month: Number(params.month),
        year: Number(params.year),
        ...(params.productionTeamId ? { productionTeamId: params.productionTeamId } : {}),
      },
      orderBy: [{ productionTeamId: 'asc' }, { employee: { employeeCode: 'asc' } }],
      include: {
        branch: { select: { code: true, name: true } },
        productionTeam: { select: { code: true, name: true } },
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            positionTitle: true,
            department: { select: { name: true } },
          },
        },
        attendanceSummary: {
          select: {
            actualWorkDays: true,
            standardWorkDays: true,
          },
        },
      },
    });

    if (payrolls.length > 0) {
      await prisma.payroll.updateMany({
        where: { id: { in: payrolls.map((p) => p.id) } },
        data: {
          printedCount: { increment: 1 },
          lastPrintedAt: new Date(),
          lastPrintedFormat: params.format,
        },
      });
    }

    await AuditService.log({
      userId: actor.id,
      branchId: params.branchId,
      action: `PAYSLIP_BATCH_PRINT_${params.format}`,
      module: 'PAYROLL',
      ipAddress,
      metadata: {
        month: params.month,
        year: params.year,
        productionTeamId: params.productionTeamId ?? 'ALL_TEAMS',
        totalSlips: payrolls.length,
      },
    });

    return {
      printJobMeta: {
        format: params.format,
        paperSpec:
          params.format === 'K80_THERMAL'
            ? 'Khổ nhiệt K80 (80mm) - Tự động cắt rời từng phiếu'
            : 'Khổ A4 (210x297mm) - 3 phiếu lương / 1 tờ A4',
        month: params.month,
        year: params.year,
        totalSlips: payrolls.length,
        printedBy: actor.username,
        printedAt: new Date().toISOString(),
      },
      slips: payrolls.map((p) => ({
        payrollId: p.id,
        branchName: p.branch.name,
        productionTeamName: p.productionTeam?.name ?? 'Khối Văn Phòng / Chung',
        employeeCode: p.employee.employeeCode,
        fullName: p.employee.fullName,
        positionTitle: p.employee.positionTitle,
        workDays: `${p.attendanceSummary?.actualWorkDays ?? 0}/${p.attendanceSummary?.standardWorkDays ?? 26}`,
        baseSalary: Number(p.baseSalary),
        workDaySalary: Number(p.workDaySalary),
        // In đậm số giờ tăng ca & Tiền thực lãnh để công nhân dễ đối chiếu theo đúng tài liệu
        highlightBold: {
          totalOvertimeHours: Number(p.totalOvertimeHours),
          overtimePay: Number(p.overtimePay),
          netPay: Number(p.netPay),
        },
        allowancesAndBonus: Number(p.totalAllowances) + Number(p.bonus),
        totalDeductions:
          Number(p.insuranceDeduction) +
          Number(p.taxDeduction) +
          Number(p.advanceDeduction) +
          Number(p.otherDeduction),
      })),
    };
  }
}
