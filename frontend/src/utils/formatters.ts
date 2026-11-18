export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Quản Trị Tối Cao (Super Admin)',
  DIRECTOR: 'Ban Tổng Giám Đốc (HQ)',
  IT_ADMIN: 'Quản Trị Hạ Tầng IT Remote',
  HR_MANAGER: 'Trưởng Phòng Nhân Sự (HQ)',
  HR_BRANCH: 'Chuyên Viên Nhân Sự Chi Nhánh',
  ACCOUNTANT_HQ: 'Kế Toán Trưởng (HQ)',
  ACCOUNTANT_BRANCH: 'Kế Toán Tiền Lương Nhà Xưởng',
  PRODUCTION_MANAGER: 'Quản Lý Kế Hoạch Sản Xuất',
  PURCHASING_STAFF: 'Chuyên Viên Thu Mua Vật Tư',
  SALES_STAFF: 'Chuyên Viên Kinh Doanh (B2B)',
  OFFICE_STAFF: 'Nhân Viên Văn Phòng',
  FACTORY_WORKER: 'Công Nhân Sản Xuất (Tổ/Chuyền)',
};

export const SCOPE_LABELS: Record<string, string> = {
  ALL_BRANCHES: 'Toàn hệ thống Đa Chi Nhánh',
  OWN_BRANCH: 'Nội bộ Chi nhánh / Nhà xưởng',
  OWN_DEPARTMENT: 'Nội bộ Phòng ban',
  OWN_TEAM: 'Nội bộ Tổ / Chuyền sản xuất',
  SELF: 'Dữ liệu Cá nhân',
};

export const EMPLOYEE_TYPE_LABELS: Record<string, string> = {
  OFFICE_STAFF: 'Khối Văn Phòng',
  FACTORY_WORKER: 'Khối Sản Xuất (Tổ/Chuyền)',
  EXECUTIVE: 'Ban Điều Hành',
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  OFFICIAL: 'Chính thức',
  PROBATION: 'Thử việc',
  MATERNITY_LEAVE: 'Nghỉ thai sản',
  UNPAID_LEAVE: 'Nghỉ không lương',
  RESIGNED: 'Đã nghỉ việc',
};

export const TASK_PRIORITY_META: Record<
  string,
  { label: string; className: string }
> = {
  URGENT: {
    label: 'Khẩn cấp',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  HIGH: {
    label: 'Ưu tiên cao',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  MEDIUM: {
    label: 'Trung bình',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  LOW: {
    label: 'Thấp',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const PURCHASE_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Bản nháp',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  PENDING_APPROVAL: {
    label: 'Chờ phê duyệt',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Đã duyệt chi',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  ORDERED: {
    label: 'Đã đặt hàng NCC',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RECEIVED: {
    label: 'Đã nhập kho',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const formatVND = (amount: number | string | undefined | null): string => {
  const num = Number(amount || 0);
  return `${num.toLocaleString('vi-VN')} ₫`;
};

export const getInitials = (name?: string | null): string => {
  if (!name) return 'NV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
