import { z } from 'zod';
import {
  ContractStatus,
  ContractType,
  EmployeeType,
  EmploymentStatus,
  Gender,
} from '@prisma/client';

export const createEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z
      .string()
      .min(3, 'Mã nhân viên tối thiểu 3 ký tự')
      .max(30),
    userId: z.string().uuid().optional(),
    branchId: z.string().uuid('branchId phải là UUID hợp lệ'),
    departmentId: z.string().uuid('departmentId phải là UUID hợp lệ'),
    productionTeamId: z.string().uuid().nullable().optional(),
    attendanceDeviceId: z.string().nullable().optional(),

    fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
    avatarUrl: z.string().url().nullable().optional(),
    gender: z.nativeEnum(Gender).optional(),
    dateOfBirth: z.coerce.date().optional(),
    nationalId: z.string().min(9).max(20).optional(),
    nationalIdIssueDate: z.coerce.date().optional(),
    nationalIdIssuePlace: z.string().optional(),
    taxCode: z.string().optional(),
    socialInsuranceNo: z.string().optional(),
    phone: z.string().optional(),
    personalEmail: z.string().email().optional(),
    permanentAddress: z.string().optional(),
    currentAddress: z.string().optional(),

    positionTitle: z.string().min(2, 'Chức danh công việc là bắt buộc'),
    employeeType: z.nativeEnum(EmployeeType).default(EmployeeType.OFFICE_STAFF),
    employmentStatus: z.nativeEnum(EmploymentStatus).default(EmploymentStatus.OFFICIAL),
    hireDate: z.coerce.date().optional(),
    officialDate: z.coerce.date().optional(),

    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID nhân viên không hợp lệ'),
  }),
  body: createEmployeeSchema.shape.body.partial(),
});

export const updateSelfProfileSchema = z.object({
  body: z.object({
    phone: z.string().optional(),
    personalEmail: z.string().email().optional(),
    currentAddress: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const createContractSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID nhân viên không hợp lệ'),
  }),
  body: z.object({
    contractNumber: z.string().min(3, 'Số hợp đồng không hợp lệ'),
    contractType: z.nativeEnum(ContractType),
    status: z.nativeEnum(ContractStatus).default(ContractStatus.ACTIVE),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    signedDate: z.coerce.date().optional(),
    baseSalary: z.coerce.number().min(0),
    insuranceSalary: z.coerce.number().min(0).default(0),
    positionAllowance: z.coerce.number().min(0).default(0),
    mealAllowance: z.coerce.number().min(0).default(0),
    transportAllowance: z.coerce.number().min(0).default(0),
    otherAllowance: z.coerce.number().min(0).default(0),
    nasPdfPath: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const listEmployeesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    branchId: z.string().uuid().optional(),
    departmentId: z.string().uuid().optional(),
    productionTeamId: z.string().uuid().optional(),
    employeeType: z.nativeEnum(EmployeeType).optional(),
    employmentStatus: z.nativeEnum(EmploymentStatus).optional(),
    search: z.string().optional(),
  }),
});
