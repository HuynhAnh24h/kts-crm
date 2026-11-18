import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  IdCard,
  Building2,
  Printer,
  UserCircle,
  LayoutDashboard,
  LogOut,
  Network,
  FolderLock,
  CalendarClock,
  KanbanSquare,
  Factory,
  ShoppingCart,
  Briefcase,
  History,
  ChevronRight,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { clearSession } from '../store/authSlice';
import { apiClient } from '../api/axiosClient';
import { getInitials, ROLE_LABELS, SCOPE_LABELS } from '../utils/formatters';

export const AppLayout: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const hasPerm = (perm: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.effectivePermissions?.includes(perm);
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('kts_refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // ignore
    }
    dispatch(clearSession());
    navigate('/login');
  };

  const navSections = [
    {
      title: 'BÀN LÀM VIỆC & ĐIỀU HÀNH',
      items: [
        {
          to: '/dashboard',
          label: 'Tổng quan Điều hành',
          icon: LayoutDashboard,
          show: true,
        },
        {
          to: '/tasks',
          label: 'Công việc Văn phòng (Kanban)',
          icon: KanbanSquare,
          show: hasPerm('tasks:read'),
        },
      ],
    },
    {
      title: 'SẢN XUẤT, THU MUA & CRM',
      items: [
        {
          to: '/production-plans',
          label: 'Kế hoạch Sản xuất (Tổ/Chuyền)',
          icon: Factory,
          show: hasPerm('production:read') || hasPerm('teams:read'),
        },
        {
          to: '/purchasing',
          label: 'Thu mua & Cung ứng Vật tư',
          icon: ShoppingCart,
          show: hasPerm('purchasing:read') || hasPerm('payroll:read'),
        },
        {
          to: '/customers',
          label: 'Khách hàng & Đối tác (B2B)',
          icon: Briefcase,
          show: hasPerm('customers:read') || hasPerm('branches:read'),
        },
      ],
    },
    {
      title: 'NHÂN SỰ, CÔNG & TIỀN LƯƠNG',
      items: [
        {
          to: '/employees',
          label: 'Hồ sơ Nhân sự 360° & HĐ',
          icon: IdCard,
          show: hasPerm('employees:read'),
        },
        {
          to: '/attendance-payroll',
          label: 'Chấm công, Khóa công & Lương',
          icon: CalendarClock,
          show: hasPerm('attendance:read') || hasPerm('payroll:read'),
        },
        {
          to: '/payslips',
          label: 'In Phiếu Lương K80 / A4',
          icon: Printer,
          show: hasPerm('payroll:print_slip') || hasPerm('payroll:read'),
        },
      ],
    },
    {
      title: 'HỆ THỐNG & PHÂN QUYỀN',
      items: [
        {
          to: '/organization',
          label: 'Chi nhánh, Phòng ban & NAS',
          icon: Building2,
          show: hasPerm('branches:read') || hasPerm('departments:read'),
        },
        {
          to: '/users',
          label: 'Tài khoản & Phân quyền RBAC',
          icon: Users,
          show: hasPerm('users:read'),
        },
        {
          to: '/audit-logs',
          label: 'Nhật ký Thao tác (Audit Logs)',
          icon: History,
          show: hasPerm('audit_logs:read') || hasPerm('users:read'),
        },
        {
          to: '/my-profile',
          label: 'Hồ sơ Cá nhân & Mật khẩu',
          icon: UserCircle,
          show: true,
        },
      ],
    },
  ];

  const allItems = navSections.flatMap((s) => s.items);
  const currentNav = allItems.find((i) => location.pathname.startsWith(i.to));

  const scopeBadgeColor =
    user?.dataScope === 'ALL_BRANCHES'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : user?.dataScope === 'OWN_BRANCH'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-sky-50 text-sky-700 border-sky-200';

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900">
      {/* Enterprise Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200/90 flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <Network className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900">
                KTS WORKSPACE
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                ERP 2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Hệ thống Quản trị Đa Chi Nhánh
            </p>
          </div>
        </div>

        {/* Active Branch & Security Context Widget */}
        {user && (
          <div className="p-3.5 mx-3 mt-3 mb-1 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Đơn vị công tác
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white text-blue-700 border border-blue-200 shadow-2xs">
                {user.branch?.code}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 truncate">
              {user.branch?.name}
            </p>
            <div className="flex flex-wrap gap-1 pt-0.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${scopeBadgeColor}`}
              >
                {SCOPE_LABELS[user.dataScope] || user.dataScope}
              </span>
            </div>
          </div>
        )}

        {/* Categorized Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((i) => i.show);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Footer Card */}
        {user && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {getInitials(user.employee?.fullName || user.username)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.employee?.fullName || user.username}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>
              {user.twoFactorEnabled && (
                <span
                  title="Bảo mật 2FA Google Mail đang bật"
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất phiên làm việc
            </button>
          </div>
        )}
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Enterprise Header */}
        <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">KTS ERP</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 text-sm">
              {currentNav?.label || 'Bàn làm việc'}
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 text-xs">
              {user.roleInfo?.nasFolderGroup && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  <FolderLock className="w-3.5 h-3.5" />
                  Ổ đĩa NAS: {user.roleInfo.nasFolderGroup}
                </span>
              )}
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                2FA Gmail Bảo vệ
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-700 font-medium">
                {user.email}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
