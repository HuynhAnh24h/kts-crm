import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database';

async function main() {
  console.log('🌱 Seeding KTS Multi-Branch CRM Database...');

  const defaultPasswordHash = await bcrypt.hash('Kts@2026', 12);

  // 1. Tạo 2 Chi nhánh theo mô hình Hub (HQ) & Spoke (Factory)
  const hqBranch = await prisma.branch.upsert({
    where: { code: 'HQ-HCM' },
    update: {},
    create: {
      code: 'HQ-HCM',
      name: 'Trụ Sở Chính (HQ Hub)',
      type: 'HQ',
      subnetCidr: '10.10.0.0/16',
      officeVlanCidr: '10.10.30.0/23',
      iotVlanCidr: '10.10.40.0/24',
      address: 'Tòa nhà KTS HQ, TP. Hồ Chí Minh',
      phone: '028-3800-1111',
    },
  });

  const factoryBranch = await prisma.branch.upsert({
    where: { code: 'FACTORY-BD-01' },
    update: {},
    create: {
      code: 'FACTORY-BD-01',
      name: 'Chi Nhánh Nhà Xưởng 01 (Spoke)',
      type: 'FACTORY',
      subnetCidr: '10.20.0.0/16',
      officeVlanCidr: '10.20.30.0/24',
      iotVlanCidr: '10.20.40.0/24',
      warpTunnelId: 'cf-warp-tunnel-factory-01',
      address: 'KCN VSIP, Bình Dương',
      phone: '0274-3800-2222',
    },
  });

  // 2. Tạo các Phòng ban kèm cấu hình NAS SMB Share (Access-Based Enumeration)
  const hqDepts = [
    { code: 'BOD', name: 'Ban Giám Đốc', nasSharePath: '\\\\10.10.20.250\\GiamDoc' },
    { code: 'IT', name: 'Trung Tâm Vận Hành IT', nasSharePath: '\\\\10.10.20.250\\IT_Admin' },
    { code: 'HR', name: 'Phòng Nhân Sự HQ', nasSharePath: '\\\\10.10.20.250\\NhanSu' },
    { code: 'ACC', name: 'Phòng Kế Toán HQ', nasSharePath: '\\\\10.10.20.250\\KeToan' },
    { code: 'SALE', name: 'Phòng Kinh Doanh (Sale)', nasSharePath: '\\\\10.10.20.250\\KinhDoanh' },
    { code: 'PUR', name: 'Bộ Phận Thu Mua', nasSharePath: '\\\\10.10.20.250\\DungChung\\ThuMua' },
  ];

  const createdHqDepts: Record<string, string> = {};
  for (const d of hqDepts) {
    const dept = await prisma.department.upsert({
      where: { branchId_code: { branchId: hqBranch.id, code: d.code } },
      update: {},
      create: {
        branchId: hqBranch.id,
        code: d.code,
        name: d.name,
        nasSharePath: d.nasSharePath,
      },
    });
    createdHqDepts[d.code] = dept.id;
  }

  const factoryDepts = [
    { code: 'HR-FAC', name: 'Ban Nhân Sự Xưởng', nasSharePath: '\\\\10.10.20.250\\NhanSu\\Xuong01' },
    { code: 'ACC-FAC', name: 'Ban Kế Toán Xưởng', nasSharePath: '\\\\10.10.20.250\\KeToan\\Xuong01' },
    { code: 'PROD', name: 'Phòng Kế Hoạch & Sản Xuất', nasSharePath: '\\\\10.10.20.250\\DungChung\\SanXuat' },
  ];

  const createdFactoryDepts: Record<string, string> = {};
  for (const d of factoryDepts) {
    const dept = await prisma.department.upsert({
      where: { branchId_code: { branchId: factoryBranch.id, code: d.code } },
      update: {},
      create: {
        branchId: factoryBranch.id,
        code: d.code,
        name: d.name,
        nasSharePath: d.nasSharePath,
      },
    });
    createdFactoryDepts[d.code] = dept.id;
  }

  // 3. Tạo Tổ / Chuyền sản xuất tại Nhà xưởng 01
  const teamMay01 = await prisma.productionTeam.upsert({
    where: { branchId_code: { branchId: factoryBranch.id, code: 'CHUYEN-MAY-01' } },
    update: {},
    create: {
      branchId: factoryBranch.id,
      departmentId: createdFactoryDepts['PROD'],
      code: 'CHUYEN-MAY-01',
      name: 'Chuyền May 01',
      leaderName: 'Nguyễn Văn Tổ Trưởng',
    },
  });

  // 4. Tạo Tài khoản & Hồ sơ Nhân viên mẫu cho các Role trọng yếu
  const seedAccounts = [
    {
      email: 'admin@kts.local',
      username: 'it.admin',
      role: 'SUPER_ADMIN' as const,
      dataScope: 'ALL_BRANCHES' as const,
      branchId: hqBranch.id,
      departmentId: createdHqDepts['IT'],
      employeeCode: 'NV-HQ-0001',
      fullName: 'Trần Quản Trị IT',
      positionTitle: 'IT Infrastructure & Security Lead',
      employeeType: 'OFFICE_STAFF' as const,
      baseSalary: 35000000,
    },
    {
      email: 'director@kts.local',
      username: 'giamdoc',
      role: 'DIRECTOR' as const,
      dataScope: 'ALL_BRANCHES' as const,
      branchId: hqBranch.id,
      departmentId: createdHqDepts['BOD'],
      employeeCode: 'NV-HQ-0002',
      fullName: 'Lê Tổng Giám Đốc',
      positionTitle: 'Tổng Giám Đốc Điều Hành',
      employeeType: 'EXECUTIVE' as const,
      baseSalary: 80000000,
    },
    {
      email: 'hr.hq@kts.local',
      username: 'hr.truongphong',
      role: 'HR_MANAGER' as const,
      dataScope: 'ALL_BRANCHES' as const,
      branchId: hqBranch.id,
      departmentId: createdHqDepts['HR'],
      employeeCode: 'NV-HQ-0003',
      fullName: 'Phạm Trưởng Phòng Nhân Sự',
      positionTitle: 'Trưởng Phòng Nhân Sự Toàn Hệ Thống',
      employeeType: 'OFFICE_STAFF' as const,
      baseSalary: 28000000,
    },
    {
      email: 'hr.xuong1@kts.local',
      username: 'hr.xuong1',
      role: 'HR_BRANCH' as const,
      dataScope: 'OWN_BRANCH' as const,
      branchId: factoryBranch.id,
      departmentId: createdFactoryDepts['HR-FAC'],
      employeeCode: 'NV-FAC1-0001',
      fullName: 'Hoàng Nhân Sự Xưởng 01',
      positionTitle: 'Chuyên Viên Nhân Sự Nhà Xưởng 01',
      employeeType: 'OFFICE_STAFF' as const,
      baseSalary: 15000000,
    },
    {
      email: 'ketoan.xuong1@kts.local',
      username: 'ketoan.xuong1',
      role: 'ACCOUNTANT_BRANCH' as const,
      dataScope: 'OWN_BRANCH' as const,
      branchId: factoryBranch.id,
      departmentId: createdFactoryDepts['ACC-FAC'],
      employeeCode: 'NV-FAC1-0002',
      fullName: 'Đỗ Kế Toán Xưởng 01',
      positionTitle: 'Kế Toán Tiền Lương Nhà Xưởng 01',
      employeeType: 'OFFICE_STAFF' as const,
      baseSalary: 16000000,
    },
    {
      email: 'congnhan01@kts.local',
      username: 'cn.may01',
      role: 'FACTORY_WORKER' as const,
      dataScope: 'SELF' as const,
      branchId: factoryBranch.id,
      departmentId: createdFactoryDepts['PROD'],
      productionTeamId: teamMay01.id,
      employeeCode: 'CN-FAC1-0101',
      fullName: 'Nguyễn Thị Công Nhân May',
      positionTitle: 'Công Nhân Chuyền May 01',
      employeeType: 'FACTORY_WORKER' as const,
      baseSalary: 8500000,
    },
  ];

  for (const acc of seedAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        username: acc.username,
        passwordHash: defaultPasswordHash,
        role: acc.role,
        dataScope: acc.dataScope,
        branchId: acc.branchId,
        allowedBranchIds: [acc.branchId],
        twoFactorEnabled: acc.role !== 'FACTORY_WORKER',
      },
    });

    const emp = await prisma.employee.upsert({
      where: { employeeCode: acc.employeeCode },
      update: { userId: user.id },
      create: {
        employeeCode: acc.employeeCode,
        userId: user.id,
        branchId: acc.branchId,
        departmentId: acc.departmentId,
        productionTeamId: acc.productionTeamId ?? null,
        fullName: acc.fullName,
        positionTitle: acc.positionTitle,
        employeeType: acc.employeeType,
        employmentStatus: 'OFFICIAL',
      },
    });

    await prisma.contract.upsert({
      where: { contractNumber: `HDLD-2026-${acc.employeeCode}` },
      update: {},
      create: {
        contractNumber: `HDLD-2026-${acc.employeeCode}`,
        employeeId: emp.id,
        contractType: 'INDEFINITE',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        baseSalary: acc.baseSalary,
        insuranceSalary: acc.baseSalary * 0.8,
        mealAllowance: 730000,
        nasPdfPath: `\\\\10.10.20.250\\NhanSu\\HopDong\\2026\\HDLD-2026-${acc.employeeCode}.pdf`,
      },
    });

    if (acc.employeeType === 'FACTORY_WORKER') {
      const att = await prisma.attendanceSummary.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: 11,
            year: 2026,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          branchId: acc.branchId,
          month: 11,
          year: 2026,
          standardWorkDays: 26,
          actualWorkDays: 26,
          overtimeHoursNormal: 24,
          overtimeHoursWeekend: 8,
          isLocked: true,
          lockedAt: new Date(),
        },
      });

      await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: 11,
            year: 2026,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          branchId: acc.branchId,
          productionTeamId: acc.productionTeamId ?? null,
          attendanceSummaryId: att.id,
          month: 11,
          year: 2026,
          baseSalary: acc.baseSalary,
          workDaySalary: acc.baseSalary,
          totalOvertimeHours: 32,
          overtimePay: 1950000,
          totalAllowances: 730000,
          bonus: 500000,
          grossSalary: acc.baseSalary + 1950000 + 730000 + 500000,
          insuranceDeduction: 714000,
          netPay: acc.baseSalary + 1950000 + 730000 + 500000 - 714000,
          status: 'CALCULATED',
        },
      });
    }
  }

  console.log('✅ Seed completed successfully! Default password for all accounts: Kts@2026');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
