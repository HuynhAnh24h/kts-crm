import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  IdCard,
  ShieldCheck,
  FolderLock,
  Layers,
  CheckCircle2,
  Server,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import { BranchInfo } from '../types/crm';

export const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [employeeTotal, setEmployeeTotal] = useState<number>(0);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const [branchRes, empRes] = await Promise.all([
          apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
          apiClient.get('/employees?limit=1').catch(() => ({ data: { meta: { total: 0 } } })),
        ]);
        setBranches(branchRes.data.data || []);
        setEmployeeTotal(empRes.data.meta?.total ?? empRes.data.data?.length ?? 0);
      } catch {
        // ignore
      }
    };
    loadSummary();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Banner Kiến trúc Hub & Spoke */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg shadow-blue-600/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/25">
              Hub & Spoke Multi-Branch CRM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
              Google Mail 2FA Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Xin chào, {user.employee?.fullName || user.username}!
          </h2>
          <p className="text-sm text-blue-100">
            Bạn đang đăng nhập với vai trò{' '}
            <strong className="text-white underline decoration-blue-300">{user.roleInfo?.name || user.role}</strong> tại{' '}
            <strong className="text-amber-200">{user.branch?.name}</strong> (Phạm vi dữ liệu:{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/15 text-white font-semibold">
              {user.dataScope}
            </code>
            ).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20">
            <p className="text-xs text-blue-100">Nhóm ổ đĩa mạng NAS (ABE)</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <FolderLock className="w-4 h-4 text-amber-300" />
              {user.roleInfo?.nasFolderGroup || 'Dùng chung'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20">
            <p className="text-xs text-blue-100">Tổng số quyền hiệu lực</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              {user.effectivePermissions?.length || 0} permissions
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ chỉ số theo Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Chi nhánh trong phạm vi</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{branches.length || 1}</p>
          <p className="text-xs text-slate-500">
            {user.dataScope === 'ALL_BRANCHES'
              ? 'Toàn bộ Trụ sở HQ & các Nhà xưởng'
              : `Giới hạn tại ${user.branch?.code}`}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Hồ sơ Nhân sự hiển thị</span>
            <IdCard className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{employeeTotal}</p>
          <p className="text-xs text-slate-500">
            Đã lọc tự động theo DataScope ({user.dataScope})
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Cơ chế Xác thực 2FA</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {user.twoFactorEnabled ? 'Google Mail OTP' : 'Tắt'}
          </p>
          <p className="text-xs text-slate-500">
            Mã 6 chữ số SHA-256 hiệu lực 5 phút
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Hạ tầng Server & DB</span>
            <Server className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">VLAN 20</p>
          <p className="text-xs text-slate-500">
            PostgreSQL Docker Isolated + NAS Backup
          </p>
        </div>
      </div>

      {/* Danh sách Chi nhánh & Quyền hạn hiện tại */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Danh sách Chi nhánh được phép truy cập ({branches.length})
          </h3>
          <div className="space-y-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {b.code}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{b.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    LAN: {b.subnetCidr || 'N/A'} | VLAN 30 (Office): {b.officeVlanCidr || 'N/A'} | VLAN 40 (IoT): {b.iotVlanCidr || 'N/A'}
                  </p>
                </div>
                {b._count && (
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-medium shrink-0">
                    <span className="px-2.5 py-1 rounded bg-white border border-slate-200">
                      {b._count.departments} Phòng ban
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white border border-slate-200">
                      {b._count.productionTeams} Tổ/Chuyền
                    </span>
                    <span className="px-2.5 py-1 rounded bg-white border border-slate-200">
                      {b._count.employees} Nhân sự
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Quyền hạn hiệu lực của tài khoản ({user.effectivePermissions?.length || 0})
          </h3>
          <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
            {user.effectivePermissions?.map((perm) => (
              <span
                key={perm}
                className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
