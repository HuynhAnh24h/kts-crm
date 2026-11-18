import { DataScope, RoleCode } from '@prisma/client';

/**
 * Danh mục toàn bộ quyền hạn (Permissions) trong hệ thống KTS CRM Đa Chi Nhánh.
 * Thiết kế theo chuẩn module:action bám sát cấu trúc https://tai-lieu-network.vercel.app/
 */
export const PERMISSIONS = {
  // 1. Quản trị Chi nhánh, Phòng ban, Tổ/Chuyền (Organization)
  BRANCHES_READ: 'branches:read',
  BRANCHES_MANAGE: 'branches:manage',
  DEPARTMENTS_READ: 'departments:read',
  DEPARTMENTS_MANAGE: 'departments:manage',
  TEAMS_READ: 'teams:read',
  TEAMS_MANAGE: 'teams:manage',

  // 2. Quản trị Tài khoản & Phân quyền (User & RBAC Administration)
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_LOCK: 'users:lock',
  USERS_ASSIGN_ROLE: 'users:assign_role',
  USERS_MANAGE_2FA: 'users:manage_2fa',

  // 3. Quản trị Hồ sơ Nhân viên (Employee Profiles & Contracts)
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_READ_SENSITIVE: 'employees:read_sensitive', // CCCD, ngân hàng, mức lương HĐ
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  CONTRACTS_READ: 'contracts:read',
  CONTRACTS_MANAGE: 'contracts:manage',

  // 4. Chấm công & Tính công Nhân sự (Attendance & Timesheet)
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_UPDATE: 'attendance:update',
  ATTENDANCE_LOCK: 'attendance:lock', // Khóa công để đẩy sang Phần mềm Tính lương

  // 5. Kế toán Tính lương & In Phiếu lương K80/A4 theo Tổ/Chuyền (Payroll)
  PAYROLL_READ: 'payroll:read',
  PAYROLL_CALCULATE: 'payroll:calculate',
  PAYROLL_APPROVE: 'payroll:approve',
  PAYROLL_PRINT_SLIP: 'payroll:print_slip', // In phiếu lương K80/A4 theo Tổ/Chuyền

  // 6. Kế hoạch Sản xuất (Production Planning)
  PRODUCTION_READ: 'production:read',
  PRODUCTION_MANAGE: 'production:manage',

  // 7. Bộ phận Thu mua (Purchasing)
  PURCHASING_READ: 'purchasing:read',
  PURCHASING_CREATE: 'purchasing:create',
  PURCHASING_APPROVE: 'purchasing:approve',

  // 8. Kinh doanh / Khách hàng (Sales / CRM)
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_MANAGE: 'customers:manage',

  // 9. Công việc Văn phòng (Office Tasks)
  TASKS_READ: 'tasks:read',
  TASKS_MANAGE: 'tasks:manage',

  // 10. Nhật ký thao tác & Vận hành IT (Audit Logs & System)
  AUDIT_LOGS_READ: 'audit_logs:read',
  SYSTEM_MONITOR: 'system:monitor',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

/**
 * Cấu hình Mặc định cho từng Role theo kiến trúc Hub (HQ) & Spoke (Chi nhánh / Nhà xưởng)
 */
export interface RoleDefinition {
  code: RoleCode;
  name: string;
  description: string;
  defaultScope: DataScope;
  require2FA: boolean;
  nasFolderGroup: 'Giám đốc' | 'Kế toán' | 'Nhân sự' | 'Kinh doanh' | 'IT' | 'Dùng chung' | 'Không cấp NAS';
  permissions: PermissionCode[];
}

export const ROLE_DEFINITIONS: Record<RoleCode, RoleDefinition> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    name: 'Quản Trị Hệ Thống Tối Cao',
    description: 'Toàn quyền quản trị hệ thống, cấu hình phân quyền, chi nhánh và bảo mật',
    defaultScope: 'ALL_BRANCHES',
    require2FA: true,
    nasFolderGroup: 'IT',
    permissions: ALL_PERMISSION_CODES,
  },

  DIRECTOR: {
    code: 'DIRECTOR',
    name: 'Ban Giám Đốc (HQ)',
    description: 'Xem toàn bộ báo cáo, nhân sự, lương, kế hoạch sản xuất, thu mua của mọi chi nhánh',
    defaultScope: 'ALL_BRANCHES',
    require2FA: true,
    nasFolderGroup: 'Giám đốc',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EMPLOYEES_READ_SENSITIVE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.CONTRACTS_MANAGE,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PAYROLL_READ,
      PERMISSIONS.PAYROLL_APPROVE,
      PERMISSIONS.PAYROLL_PRINT_SLIP,
      PERMISSIONS.PRODUCTION_READ,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASING_READ,
      PERMISSIONS.PURCHASING_APPROVE,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_MANAGE,
      PERMISSIONS.AUDIT_LOGS_READ,
    ],
  },

  IT_ADMIN: {
    code: 'IT_ADMIN',
    name: 'Trung Tâm Vận Hành IT Remote (VLAN 10)',
    description: 'Quản lý tài khoản AD/LDAP, phân quyền user, giám sát nhật ký thao tác và bảo mật 2FA',
    defaultScope: 'ALL_BRANCHES',
    require2FA: true,
    nasFolderGroup: 'IT',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.BRANCHES_MANAGE,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.DEPARTMENTS_MANAGE,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.TEAMS_MANAGE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_LOCK,
      PERMISSIONS.USERS_ASSIGN_ROLE,
      PERMISSIONS.USERS_MANAGE_2FA,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.AUDIT_LOGS_READ,
      PERMISSIONS.SYSTEM_MONITOR,
    ],
  },

  HR_MANAGER: {
    code: 'HR_MANAGER',
    name: 'Trưởng Phòng Nhân Sự (HQ)',
    description: 'Quản trị hồ sơ nhân viên, hợp đồng PDF trên NAS, chấm công toàn bộ chi nhánh',
    defaultScope: 'ALL_BRANCHES',
    require2FA: true,
    nasFolderGroup: 'Nhân sự',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.DEPARTMENTS_MANAGE,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.TEAMS_MANAGE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EMPLOYEES_READ_SENSITIVE,
      PERMISSIONS.EMPLOYEES_CREATE,
      PERMISSIONS.EMPLOYEES_UPDATE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.CONTRACTS_MANAGE,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_UPDATE,
      PERMISSIONS.ATTENDANCE_LOCK,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_MANAGE,
    ],
  },

  HR_BRANCH: {
    code: 'HR_BRANCH',
    name: 'Nhân Sự Chi Nhánh / Xưởng',
    description: 'Chỉ xem và thao tác trên danh sách nhân viên, tổ/chuyền và công thuộc chi nhánh của mình',
    defaultScope: 'OWN_BRANCH',
    require2FA: true,
    nasFolderGroup: 'Nhân sự',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.TEAMS_MANAGE,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EMPLOYEES_READ_SENSITIVE,
      PERMISSIONS.EMPLOYEES_CREATE,
      PERMISSIONS.EMPLOYEES_UPDATE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.CONTRACTS_MANAGE,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_UPDATE,
      PERMISSIONS.ATTENDANCE_LOCK,
      PERMISSIONS.PAYROLL_PRINT_SLIP,
      PERMISSIONS.TASKS_READ,
    ],
  },

  ACCOUNTANT_HQ: {
    code: 'ACCOUNTANT_HQ',
    name: 'Kế Toán Trưởng / Kế Toán HQ',
    description: 'Quản lý bảng lương, hợp đồng, duyệt chi thu mua trên toàn bộ chi nhánh',
    defaultScope: 'ALL_BRANCHES',
    require2FA: true,
    nasFolderGroup: 'Kế toán',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EMPLOYEES_READ_SENSITIVE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PAYROLL_READ,
      PERMISSIONS.PAYROLL_CALCULATE,
      PERMISSIONS.PAYROLL_APPROVE,
      PERMISSIONS.PAYROLL_PRINT_SLIP,
      PERMISSIONS.PURCHASING_READ,
      PERMISSIONS.PURCHASING_APPROVE,
      PERMISSIONS.TASKS_READ,
    ],
  },

  ACCOUNTANT_BRANCH: {
    code: 'ACCOUNTANT_BRANCH',
    name: 'Kế Toán Chi Nhánh / Xưởng',
    description: 'Xem công/lương trong phạm vi chi nhánh, tính lương và xuất lệnh in phiếu lương K80/A4 theo Tổ/Chuyền',
    defaultScope: 'OWN_BRANCH',
    require2FA: true,
    nasFolderGroup: 'Kế toán',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.EMPLOYEES_READ_SENSITIVE,
      PERMISSIONS.CONTRACTS_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PAYROLL_READ,
      PERMISSIONS.PAYROLL_CALCULATE,
      PERMISSIONS.PAYROLL_PRINT_SLIP,
      PERMISSIONS.PURCHASING_READ,
      PERMISSIONS.TASKS_READ,
    ],
  },

  PRODUCTION_MANAGER: {
    code: 'PRODUCTION_MANAGER',
    name: 'Quản Lý Kế Hoạch Sản Xuất',
    description: 'Lập kế hoạch sản xuất, điều phối Tổ/Chuyền và theo dõi quân số đi làm tại xưởng',
    defaultScope: 'OWN_BRANCH',
    require2FA: false,
    nasFolderGroup: 'Dùng chung',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.TEAMS_READ,
      PERMISSIONS.TEAMS_MANAGE,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PRODUCTION_READ,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.PURCHASING_READ,
      PERMISSIONS.PURCHASING_CREATE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_MANAGE,
    ],
  },

  PURCHASING_STAFF: {
    code: 'PURCHASING_STAFF',
    name: 'Chuyên Viên Thu Mua (Purchasing)',
    description: 'Quản lý yêu cầu mua hàng, nhà cung cấp và tiến độ cung ứng vật tư sản xuất',
    defaultScope: 'OWN_BRANCH',
    require2FA: false,
    nasFolderGroup: 'Dùng chung',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.PRODUCTION_READ,
      PERMISSIONS.PURCHASING_READ,
      PERMISSIONS.PURCHASING_CREATE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_MANAGE,
    ],
  },

  SALES_STAFF: {
    code: 'SALES_STAFF',
    name: 'Nhân Viên Kinh Doanh (Sale)',
    description: 'Quản lý khách hàng, đơn hàng thuộc chi nhánh (ABE ẩn hoàn toàn thư mục Kế toán & Nhân sự)',
    defaultScope: 'OWN_BRANCH',
    require2FA: false,
    nasFolderGroup: 'Kinh doanh',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.CUSTOMERS_READ,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.TASKS_READ,
      PERMISSIONS.TASKS_MANAGE,
    ],
  },

  OFFICE_STAFF: {
    code: 'OFFICE_STAFF',
    name: 'Nhân Viên Văn Phòng',
    description: 'Xem hồ sơ cá nhân, chấm công cá nhân và xử lý công việc văn phòng được giao',
    defaultScope: 'SELF',
    require2FA: false,
    nasFolderGroup: 'Dùng chung',
    permissions: [
      PERMISSIONS.BRANCHES_READ,
      PERMISSIONS.DEPARTMENTS_READ,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PAYROLL_READ,
      PERMISSIONS.TASKS_READ,
    ],
  },

  FACTORY_WORKER: {
    code: 'FACTORY_WORKER',
    name: 'Công Nhân Sản Xuất (Tổ / Chuyền)',
    description: 'Công nhân chấm công khuôn mặt/vân tay tại xưởng và nhận phiếu lương giấy K80/A4',
    defaultScope: 'SELF',
    require2FA: false,
    nasFolderGroup: 'Không cấp NAS',
    permissions: [
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.PAYROLL_READ,
    ],
  },
};

/**
 * Tính toán danh sách quyền hiệu lực thực tế của 1 User
 * = (Quyền mặc định theo Role + customPermissions) - revokedPermissions
 */
export function resolveEffectivePermissions(
  role: RoleCode,
  customPermissions: string[] = [],
  revokedPermissions: string[] = []
): PermissionCode[] {
  if (role === 'SUPER_ADMIN') {
    return ALL_PERMISSION_CODES;
  }

  const basePermissions = ROLE_DEFINITIONS[role]?.permissions ?? [];
  const merged = new Set<string>([...basePermissions, ...customPermissions]);

  for (const revoked of revokedPermissions) {
    merged.delete(revoked);
  }

  return Array.from(merged) as PermissionCode[];
}
