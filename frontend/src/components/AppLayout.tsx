import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { clearSession } from '../store/authSlice';
import { apiClient } from '../api/axiosClient';

export const AppLayout: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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

  const navItems = [
    {
      to: '/dashboard',
      label: 'Tổng quan & Kiến trúc',
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: '/users',
      label: 'Quản trị User & Phân quyền',
      icon: Users,
      show: hasPerm('users:read'),
    },
    {
      to: '/employees',
      label: 'Quản trị Profile Nhân viên',
      icon: IdCard,
      show: hasPerm('employees:read'),
    },
    {
      to: '/organization',
      label: 'Chi nhánh, Phòng ban & Tổ chuyền',
      icon: Building2,
      show: hasPerm('branches:read') || hasPerm('departments:read'),
    },
    {
      to: '/payslips',
      label: 'In Phiếu Lương K80/A4 (Tổ/Chuyền)',
      icon: Printer,
      show: hasPerm('payroll:print_slip') || hasPerm('payroll:read'),
    },
    {
      to: '/my-profile',
      label: 'Hồ sơ Cá nhân của tôi',
      icon: UserCircle,
      show: true,
    },
  ];

  const scopeBadgeColor =
    user?.dataScope === 'ALL_BRANCHES'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : user?.dataScope === 'OWN_BRANCH'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-sky-50 text-sky-700 border-sky-200';

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/20">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900">
              KTS INTERNAL CRM
            </h1>
            <p className="text-xs text-slate-500">Multi-Branch Hub & Spoke</p>
          </div>
        </div>

        {/* User Branch & Scope Card */}
        {user && (
          <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Chi nhánh hiện tại
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                {user.branch?.code}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">
              {user.branch?.name}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span
                className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${scopeBadgeColor}`}
              >
                Scope: {user.dataScope}
              </span>
              {user.roleInfo?.nasFolderGroup && (
                <span className="text-[11px] px-2 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 font-medium flex items-center gap-1">
                  <FolderLock className="w-3 h-3" />
                  NAS: {user.roleInfo.nasFolderGroup}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        {/* Footer Account Info */}
        {user && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.employee?.fullName || user.username}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.roleInfo?.name || user.role}
                </p>
              </div>
              {user.twoFactorEnabled && (
                <span
                  title="Bảo mật 2FA Google Mail đang bật"
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200"
                >
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất khỏi phiên
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              crm.noibo.local (10.10.20.100)
            </span>
            <span className="text-xs text-slate-500 hidden md:inline">
              Kiến trúc MVC + Services | Bảo mật JWT + Google Mail 2FA | Cô lập dữ liệu Đa Chi Nhánh
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 font-mono font-medium">
                {user.email}
              </span>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
