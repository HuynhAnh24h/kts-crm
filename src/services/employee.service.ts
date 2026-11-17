import {
  ContractStatus,
  ContractType,
  EmployeeType,
  EmploymentStatus,
  Gender,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import {
  EMPLOYEE_FULL_INCLUDE,
  buildEmployeeScopeWhere,
  sanitizeEmployeeProfile,
} from '../models/employee.model';
import { AuthenticatedUser, BranchFilterContext } from '../types/express';
import { AppError } from '../utils/AppError';
import { AuditService } from './audit.service';

export class EmployeeService {
  /**
   * Danh sách Hồ sơ Nhân viên (Tự động lọc theo Scope: ALL_BRANCHES, OWN_BRANCH, OWN_DEPARTMENT, OWN_TEAM, SELF)
   */
  static async listEmployees(
    viewer: AuthenticatedUser,
    branchContext: BranchFilterContext,
    query: {
      page?: number;
      limit?: number;
      branchId?: string;
      departmentId?: string;
      productionTeamId?: string;
      employeeType?: EmployeeType;
      employmentStatus?: EmploymentStatus;
      search?: string;
    }
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      ...buildEmployeeScopeWhere(viewer, branchContext, {
        branchId: query.branchId,
        departmentId: query.departmentId,
        productionTeamId: query.productionTeamId,
      }),
    };

    if (query.employeeType) {
      where.employeeType = query.employeeType;
    }

    if (query.employmentStatus) {
      where.employmentStatus = query.employmentStatus;
    }

    if (query.search) {
      const q = query.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { positionTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ branchId: 'asc' }, { employeeCode: 'asc' }],
        include: EMPLOYEE_FULL_INCLUDE,
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      items: employees.map((emp) => sanitizeEmployeeProfile(emp, viewer)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xem chi tiết Hồ sơ Nhân viên theo ID (Kiểm tra chặt chẽ phạm vi Chi nhánh / Phòng ban / Cá nhân)
   */
  static async getEmployeeById(
    employeeId: string,
    viewer: AuthenticatedUser,
    branchContext: BranchFilterContext
  ) {
    const scopeWhere = buildEmployeeScopeWhere(viewer, branchContext);

    const employee = await prisma.employee.findFirst({
      where: {
        AND: [{ id: employeeId }, scopeWhere],
      },
      include: {
        ...EMPLOYEE_FULL_INCLUDE,
        contracts: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!employee) {
      throw new AppError(
        'Không tìm thấy hồ sơ nhân viên hoặc bạn không có quyền xem hồ sơ thuộc Chi nhánh/Bộ phận này',
        404,
        'EMPLOYEE_NOT_FOUND_OR_FORBIDDEN'
      );
    }

    return sanitizeEmployeeProfile(employee, viewer);
  }

  /**
   * Xem Hồ sơ Nhân viên của chính tài khoản đang đăng nhập (/api/v1/employees/me)
   */
  static async getMyProfile(viewer: AuthenticatedUser) {
    if (!viewer.employeeId) {
      throw new AppError(
        'Tài khoản hiện tại chưa được liên kết với Hồ sơ Nhân viên nào',
        404,
        'PROFILE_NOT_LINKED'
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: viewer.employeeId },
      include: {
        ...EMPLOYEE_FULL_INCLUDE,
        contracts: {
          orderBy: { startDate: 'desc' },
        },
        attendanceSummaries: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
        },
        payrolls: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
        },
      },
    });

    if (!employee) {
      throw new AppError('Không tìm thấy hồ sơ cá nhân', 404, 'PROFILE_NOT_FOUND');
    }

    return employee;
  }

  /**
   * Nhân viên tự cập nhật thông tin liên hệ cá nhân của mình
   */
  static async updateMyProfile(
    viewer: AuthenticatedUser,
    input: {
      phone?: string;
      personalEmail?: string;
      currentAddress?: string;
      bankAccountNumber?: string;
      bankName?: string;
      bankBranch?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      avatarUrl?: string;
    },
    ipAddress?: string
  ) {
    if (!viewer.employeeId) {
      throw new AppError(
        'Tài khoản hiện tại chưa được liên kết với Hồ sơ Nhân viên',
        404,
        'PROFILE_NOT_LINKED'
      );
    }

    const updated = await prisma.employee.update({
      where: { id: viewer.employeeId },
      data: input,
      include: EMPLOYEE_FULL_INCLUDE,
    });

    await AuditService.log({
      userId: viewer.id,
      branchId: updated.branchId,
      action: 'EMPLOYEE_SELF_PROFILE_UPDATED',
      module: 'EMPLOYEES',
      targetId: updated.id,
      ipAddress,
      newValues: input,
    });

    return updated;
  }

  /**
   * Tạo mới Hồ sơ Nhân viên (HR HQ hoặc HR Chi nhánh/Xưởng)
   */
  static async createEmployee(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    input: {
      employeeCode: string;
      userId?: string;
      branchId: string;
      departmentId: string;
      productionTeamId?: string | null;
      attendanceDeviceId?: string | null;
      fullName: string;
      avatarUrl?: string | null;
      gender?: Gender;
      dateOfBirth?: Date;
      nationalId?: string;
      nationalIdIssueDate?: Date;
      nationalIdIssuePlace?: string;
      taxCode?: string;
      socialInsuranceNo?: string;
      phone?: string;
      personalEmail?: string;
      permanentAddress?: string;
      currentAddress?: string;
      positionTitle: string;
      employeeType?: EmployeeType;
      employmentStatus?: EmploymentStatus;
      hireDate?: Date;
      officialDate?: Date;
      bankAccountNumber?: string;
      bankName?: string;
      bankBranch?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      notes?: string;
    },
    ipAddress?: string
  ) {
    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(input.branchId)
    ) {
      throw new AppError(
        'HR Chi nhánh chỉ được phép thêm hồ sơ nhân viên thuộc Chi nhánh / Nhà xưởng của mình',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    // Kiểm tra Phòng ban có thuộc đúng Chi nhánh không
    const department = await prisma.department.findFirst({
      where: { id: input.departmentId, branchId: input.branchId },
    });
    if (!department) {
      throw new AppError(
        'Phòng ban không tồn tại hoặc không thuộc Chi nhánh đã chọn',
        400,
        'INVALID_DEPARTMENT_BRANCH'
      );
    }

    // Nếu có Tổ / Chuyền sản xuất, kiểm tra Tổ/Chuyền có thuộc đúng Chi nhánh không
    if (input.productionTeamId) {
      const team = await prisma.productionTeam.findFirst({
        where: { id: input.productionTeamId, branchId: input.branchId },
      });
      if (!team) {
        throw new AppError(
          'Tổ / Chuyền sản xuất không thuộc Chi nhánh đã chọn',
          400,
          'INVALID_PRODUCTION_TEAM_BRANCH'
        );
      }
    }

    const created = await prisma.employee.create({
      data: {
        ...input,
        employeeCode: input.employeeCode.trim().toUpperCase(),
      },
      include: EMPLOYEE_FULL_INCLUDE,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: created.branchId,
      action: 'EMPLOYEE_CREATED',
      module: 'EMPLOYEES',
      targetId: created.id,
      ipAddress,
      newValues: {
        employeeCode: created.employeeCode,
        fullName: created.fullName,
        branchId: created.branchId,
        departmentId: created.departmentId,
        productionTeamId: created.productionTeamId,
      },
    });

    return created;
  }

  /**
   * Cập nhật Hồ sơ Nhân viên (Kiểm tra quyền Chi nhánh)
   */
  static async updateEmployee(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    employeeId: string,
    input: Partial<Prisma.EmployeeUncheckedUpdateInput>,
    ipAddress?: string
  ) {
    const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!existing) {
      throw new AppError('Hồ sơ nhân viên không tồn tại', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(existing.branchId)
    ) {
      throw new AppError(
        'Bạn không có quyền chỉnh sửa hồ sơ nhân viên thuộc Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: input,
      include: EMPLOYEE_FULL_INCLUDE,
    });

    await AuditService.log({
      userId: actor.id,
      branchId: updated.branchId,
      action: 'EMPLOYEE_UPDATED',
      module: 'EMPLOYEES',
      targetId: updated.id,
      ipAddress,
      oldValues: {
        positionTitle: existing.positionTitle,
        departmentId: existing.departmentId,
        productionTeamId: existing.productionTeamId,
        employmentStatus: existing.employmentStatus,
      },
      newValues: input,
    });

    return updated;
  }

  /**
   * Tạo Hợp đồng lao động cho Nhân viên (kèm Lương hợp đồng & đường dẫn file PDF trên NAS)
   */
  static async addEmployeeContract(
    actor: AuthenticatedUser,
    branchContext: BranchFilterContext,
    employeeId: string,
    input: {
      contractNumber: string;
      contractType: ContractType;
      status?: ContractStatus;
      startDate: Date;
      endDate?: Date;
      signedDate?: Date;
      baseSalary: number;
      insuranceSalary?: number;
      positionAllowance?: number;
      mealAllowance?: number;
      transportAllowance?: number;
      otherAllowance?: number;
      nasPdfPath?: string;
      notes?: string;
    },
    ipAddress?: string
  ) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new AppError('Nhân viên không tồn tại', 404, 'EMPLOYEE_NOT_FOUND');
    }

    if (
      !branchContext.isAllBranches &&
      !branchContext.allowedBranchIds.includes(employee.branchId)
    ) {
      throw new AppError(
        'Bạn không có quyền tạo hợp đồng cho nhân viên thuộc Chi nhánh khác',
        403,
        'CROSS_BRANCH_ACCESS_DENIED'
      );
    }

    const contract = await prisma.contract.create({
      data: {
        contractNumber: input.contractNumber.trim().toUpperCase(),
        employeeId,
        contractType: input.contractType,
        status: input.status ?? 'ACTIVE',
        startDate: input.startDate,
        endDate: input.endDate,
        signedDate: input.signedDate,
        baseSalary: input.baseSalary,
        insuranceSalary: input.insuranceSalary ?? 0,
        positionAllowance: input.positionAllowance ?? 0,
        mealAllowance: input.mealAllowance ?? 0,
        transportAllowance: input.transportAllowance ?? 0,
        otherAllowance: input.otherAllowance ?? 0,
        nasPdfPath:
          input.nasPdfPath ??
          `\\\\10.10.20.250\\NhanSu\\HopDong\\${new Date().getFullYear()}\\${input.contractNumber.trim().toUpperCase()}.pdf`,
        notes: input.notes,
      },
    });

    await AuditService.log({
      userId: actor.id,
      branchId: employee.branchId,
      action: 'CONTRACT_CREATED',
      module: 'EMPLOYEES',
      targetId: contract.id,
      ipAddress,
      newValues: {
        contractNumber: contract.contractNumber,
        employeeCode: employee.employeeCode,
        baseSalary: contract.baseSalary,
        nasPdfPath: contract.nasPdfPath,
      },
    });

    return contract;
  }
}
