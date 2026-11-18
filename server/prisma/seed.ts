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
      name: 'Chuyền May Xuất Khẩu 01',
      leaderName: 'Nguyễn Văn Tổ Trưởng',
    },
  });

  const teamDongGoi02 = await prisma.productionTeam.upsert({
    where: { branchId_code: { branchId: factoryBranch.id, code: 'TO-HOAN-THIEN-02' } },
    update: {},
    create: {
      branchId: factoryBranch.id,
      departmentId: createdFactoryDepts['PROD'],
      code: 'TO-HOAN-THIEN-02',
      name: 'Tổ Hoàn Thiện & Đóng Gói 02',
      leaderName: 'Lê Thị Tổ Trưởng',
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

  // 5. Seed dữ liệu mẫu Kế hoạch Sản xuất, Thu mua, Công việc Văn phòng & Khách hàng
  const hqLeadEmp = await prisma.employee.findUnique({
    where: { employeeCode: 'NV-HQ-0003' },
  });
  const factoryHrEmp = await prisma.employee.findUnique({
    where: { employeeCode: 'NV-FAC1-0001' },
  });

  if (hqLeadEmp && factoryHrEmp) {
    // 5.1 Kế hoạch sản xuất tại Xưởng 01
    await prisma.productionPlan.upsert({
      where: { planCode: 'LSX-2026-1101' },
      update: {},
      create: {
        planCode: 'LSX-2026-1101',
        branchId: factoryBranch.id,
        productionTeamId: teamMay01.id,
        productName: 'Áo Khoác Gió Xuất Khẩu Nhật Bản (Lô Đông 2026)',
        targetQuantity: 5000,
        completedQuantity: 3850,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-28'),
        status: 'IN_PROGRESS',
        notes: 'Ưu tiên kiểm tra đường may chống thấm trước khi đóng thùng',
      },
    });

    await prisma.productionPlan.upsert({
      where: { planCode: 'LSX-2026-1102' },
      update: {},
      create: {
        planCode: 'LSX-2026-1102',
        branchId: factoryBranch.id,
        productionTeamId: teamDongGoi02.id,
        productName: 'Đóng Gói & Dán Tem Barcode Lô Áo Polo Châu Âu',
        targetQuantity: 3000,
        completedQuantity: 3000,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-15'),
        status: 'COMPLETED',
        notes: 'Đã bàn giao kho thành phẩm đúng tiến độ',
      },
    });

    // 5.2 Yêu cầu Thu mua Vật tư
    await prisma.purchaseRequest.upsert({
      where: { requestCode: 'PO-2026-00101' },
      update: {},
      create: {
        requestCode: 'PO-2026-00101',
        branchId: factoryBranch.id,
        departmentId: createdFactoryDepts['PROD'],
        requesterId: factoryHrEmp.id,
        title: 'Mua vải Polyester chống thấm & Khóa kéo YKK cho Lô LSX-2026-1101',
        supplierName: 'Công ty TNHH Nguyên Phụ Liệu Dệt May Đông Á',
        totalEstimatedAmount: 148500000,
        status: 'PENDING_APPROVAL',
        itemsJson: [
          {
            itemName: 'Vải Polyester 2 lớp chống thấm (Khổ 1m6)',
            unit: 'Mét',
            quantity: 2500,
            unitPrice: 48000,
          },
          {
            itemName: 'Khóa kéo YKK chống nước #5',
            unit: 'Cái',
            quantity: 5000,
            unitPrice: 5700,
          },
        ],
      },
    });

    await prisma.purchaseRequest.upsert({
      where: { requestCode: 'PO-2026-00102' },
      update: {},
      create: {
        requestCode: 'PO-2026-00102',
        branchId: hqBranch.id,
        departmentId: createdHqDepts['IT'],
        requesterId: hqLeadEmp.id,
        title: 'Trang bị thêm 02 Máy in nhiệt Phiếu lương K80 Auto-cut cho Xưởng',
        supplierName: 'Công ty Thiết Bị Mã Vạch & Máy In Văn Phòng KTS',
        totalEstimatedAmount: 6800000,
        status: 'APPROVED',
        itemsJson: [
          {
            itemName: 'Máy in nhiệt K80 LAN/USB tự động cắt giấy',
            unit: 'Máy',
            quantity: 2,
            unitPrice: 3100000,
          },
          {
            itemName: 'Thùng giấy in nhiệt K80x80mm (50 cuộn)',
            unit: 'Thùng',
            quantity: 1,
            unitPrice: 600000,
          },
        ],
      },
    });

    // 5.3 Công việc Văn phòng (Office Tasks Kanban)
    const sampleTasks = [
      {
        code: 'TASK-261101',
        branchId: hqBranch.id,
        departmentId: createdHqDepts['HR'],
        title: 'Rà soát & Khóa bảng chấm công tháng 11/2026 toàn hệ thống',
        description: 'Đối chiếu dữ liệu máy chấm công khuôn mặt VLAN 40 và chốt công trước ngày 28.',
        priority: 'URGENT' as const,
        status: 'IN_PROGRESS' as const,
        assigneeId: hqLeadEmp.id,
        creatorId: hqLeadEmp.id,
        dueDate: new Date('2026-11-28'),
      },
      {
        code: 'TASK-261102',
        branchId: factoryBranch.id,
        departmentId: createdFactoryDepts['ACC-FAC'],
        title: 'In phiếu lương K80 đợt 1 cho công nhân Chuyền May 01',
        description: 'Kiểm tra kỹ cột Giờ tăng ca và Thực lãnh in đậm trước khi phát cho Tổ trưởng.',
        priority: 'HIGH' as const,
        status: 'TODO' as const,
        assigneeId: factoryHrEmp.id,
        creatorId: hqLeadEmp.id,
        dueDate: new Date('2026-11-30'),
      },
      {
        code: 'TASK-261103',
        branchId: hqBranch.id,
        departmentId: createdHqDepts['IT'],
        title: 'Kiểm tra định kỳ Snapshot 2h trên NAS Enterprise (10.10.20.250)',
        description: 'Đảm bảo toàn bộ Hợp đồng PDF và bản sao lưu PostgreSQL an toàn chống Ransomware.',
        priority: 'MEDIUM' as const,
        status: 'COMPLETED' as const,
        assigneeId: hqLeadEmp.id,
        creatorId: hqLeadEmp.id,
        dueDate: new Date('2026-11-20'),
      },
    ];

    for (const t of sampleTasks) {
      await prisma.officeTask.upsert({
        where: { code: t.code },
        update: {},
        create: t,
      });
    }

    // 5.4 Khách hàng B2B (Customers)
    await prisma.customer.upsert({
      where: { customerCode: 'KH-B2B-001' },
      update: {},
      create: {
        customerCode: 'KH-B2B-001',
        branchId: hqBranch.id,
        assignedEmployeeId: hqLeadEmp.id,
        companyName: 'Tập Đoàn Thời Trang Uniqlo Việt Nam',
        contactPerson: 'Mr. Kenji Takahashi (Giám đốc Thu mua)',
        phone: '028-3910-8899',
        email: 'procurement@uniqlo-partner.jp',
        taxCode: '0315889900',
        address: 'Quận 1, TP. Hồ Chí Minh',
        notes: 'Đối tác chiến lược đơn hàng xuất khẩu quý 4/2026',
      },
    });

    await prisma.customer.upsert({
      where: { customerCode: 'KH-B2B-002' },
      update: {},
      create: {
        customerCode: 'KH-B2B-002',
        branchId: hqBranch.id,
        assignedEmployeeId: hqLeadEmp.id,
        companyName: 'Công Ty Cổ Phần Chuỗi Siêu Thị Âu Á',
        contactPerson: 'Chị Nguyễn Minh Thư',
        phone: '0909-888-777',
        email: 'thu.nguyen@auaretail.vn',
        taxCode: '0312445566',
        address: 'Khu Đô Thị Sala, TP. Thủ Đức, TP.HCM',
        notes: 'Đặt gia công đồng phục nhân viên định kỳ',
      },
    });
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
