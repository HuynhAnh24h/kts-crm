export type RoleCode =
  | 'SUPER_ADMIN'
  | 'DIRECTOR'
  | 'IT_ADMIN'
  | 'HR_MANAGER'
  | 'HR_BRANCH'
  | 'ACCOUNTANT_HQ'
  | 'ACCOUNTANT_BRANCH'
  | 'PRODUCTION_MANAGER'
  | 'PURCHASING_STAFF'
  | 'SALES_STAFF'
  | 'OFFICE_STAFF'
  | 'FACTORY_WORKER';

export type DataScope =
  | 'ALL_BRANCHES'
  | 'OWN_BRANCH'
  | 'OWN_DEPARTMENT'
  | 'OWN_TEAM'
  | 'SELF';

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'PENDING_ACTIVATION';

export interface BranchInfo {
  id: string;
  code: string;
  name: string;
  type: 'HQ' | 'FACTORY' | 'OFFICE';
  subnetCidr?: string;
  officeVlanCidr?: string;
  iotVlanCidr?: string;
  warpTunnelId?: string;
  address?: string;
  phone?: string;
  _count?: {
    departments: number;
    productionTeams: number;
    users: number;
    employees: number;
  };
}

export interface DepartmentInfo {
  id: string;
  branchId: string;
  code: string;
  name: string;
  nasSharePath?: string;
  adGroupDn?: string;
  branch?: { id: string; code: string; name: string; type: string };
  _count?: { productionTeams: number; employees: number };
}

export interface ProductionTeamInfo {
  id: string;
  branchId: string;
  departmentId: string;
  code: string;
  name: string;
  leaderName?: string;
  branch?: { id: string; code: string; name: string };
  department?: { id: string; code: string; name: string };
  _count?: { employees: number };
}

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  role: RoleCode;
  dataScope: DataScope;
  branchId: string;
  allowedBranchIds: string[];
  customPermissions: string[];
  revokedPermissions: string[];
  status: AccountStatus;
  twoFactorEnabled: boolean;
  twoFactorEmail?: string | null;
  adLdapDn?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt: string;
  branch: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    positionTitle: string;
    employeeType: string;
    department?: { id: string; code: string; name: string };
    productionTeam?: { id: string; code: string; name: string } | null;
  } | null;
  roleInfo?: {
    code: RoleCode;
    name: string;
    nasFolderGroup: string;
  };
  effectivePermissions: string[];
}

export interface ContractRecord {
  id: string;
  contractNumber: string;
  contractType: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  baseSalary: string | number;
  insuranceSalary: string | number;
  mealAllowance: string | number;
  nasPdfPath?: string | null;
}

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  userId?: string | null;
  branchId: string;
  departmentId: string;
  productionTeamId?: string | null;
  attendanceDeviceId?: string | null;
  fullName: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  taxCode?: string | null;
  socialInsuranceNo?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  currentAddress?: string | null;
  positionTitle: string;
  employeeType: 'OFFICE_STAFF' | 'FACTORY_WORKER' | 'EXECUTIVE';
  employmentStatus: 'PROBATION' | 'OFFICIAL' | 'MATERNITY_LEAVE' | 'UNPAID_LEAVE' | 'RESIGNED';
  hireDate: string;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  branch: { id: string; code: string; name: string; type: string };
  department: { id: string; code: string; name: string; nasSharePath?: string | null };
  productionTeam?: { id: string; code: string; name: string; leaderName?: string | null } | null;
  user?: {
    id: string;
    email: string;
    username: string;
    role: RoleCode;
    dataScope: DataScope;
    status: AccountStatus;
    twoFactorEnabled: boolean;
  } | null;
  contracts?: ContractRecord[];
}

export interface RoleMatrixItem {
  code: RoleCode;
  name: string;
  description: string;
  defaultScope: DataScope;
  require2FA: boolean;
  nasFolderGroup: string;
  permissions: string[];
}

export interface RbacMatrixResponse {
  roles: RoleMatrixItem[];
  permissions: string[];
  dataScopes: Array<{ code: DataScope; description: string }>;
}
