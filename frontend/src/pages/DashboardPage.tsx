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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Hub & Spoke Multi-Branch CRM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Google Mail 2FA Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Xin chào, {user.employee?.fullName || user.username}!
          </h2>
          <p className="text-sm text-slate-300">
            Bạn đang đăng nhập với vai trò{' '}
            <strong className="text-blue-400">{user.roleInfo?.name || user.role}</strong> tại{' '}
            <strong className="text-emerald-400">{user.branch?.name}</strong> (Phạm vi dữ liệu:{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
              {user.dataScope}
            </code>
            ).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <p className="text-xs text-slate-400">Nhóm ổ đĩa mạng NAS (ABE)</p>
            <p className="text-sm font-bold text-purple-300 flex items-center gap-1.5 mt-0.5">
              <FolderLock className="w-4 h-4" />
              {user.roleInfo?.nasFolderGroup || 'Dùng chung'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <p className="text-xs text-slate-400">Tổng số quyền hiệu lực</p>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              {user.effectivePermissions?.length || 0} permissions
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ chỉ số theo Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Chi nhánh trong phạm vi</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{branches.length || 1}</p>
          <p className="text-xs text-slate-400">
            {user.dataScope === 'ALL_BRANCHES'
              ? 'Toàn bộ Trụ sở HQ & các Nhà xưởng'
              : `Giới hạn tại ${user.branch?.code}`}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Hồ sơ Nhân sự hiển thị</span>
            <IdCard className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{employeeTotal}</p>
          <p className="text-xs text-slate-400">
            Đã lọc tự động theo DataScope ({user.dataScope})
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Cơ chế Xác thực 2FA</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {user.twoFactorEnabled ? 'Google Mail OTP' : 'Tắt'}
          </p>
          <p className="text-xs text-slate-400">
            Mã 6 chữ số SHA-256 hiệu lực 5 phút
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Hạ tầng Server & DB</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">VLAN 20</p>
          <p className="text-xs text-slate-400">
            PostgreSQL Docker Isolated + NAS Backup
          </p>
        </div>
      </div>

      {/* Danh sách Chi nhánh & Quyền hạn hiện tại */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            Danh sách Chi nhánh được phép truy cập ({branches.length})
          </h3>
          <div className="space-y-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {b.code}
                    </span>
                    <span className="text-sm font-semibold text-white">{b.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    LAN: {b.subnetCidr || 'N/A'} | VLAN 30 (Office): {b.officeVlanCidr || 'N/A'} | VLAN 40 (IoT): {b.iotVlanCidr || 'N/A'}
                  </p>
                </div>
                {b._count && (
                  <div className="flex items-center gap-3 text-xs text-slate-300 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                      {b._count.departments} Phòng ban
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                      {b._count.productionTeams} Tổ/Chuyền
                    </span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                      {b._count.employees} Nhân sự
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Quyền hạn hiệu lực của tài khoản ({user.effectivePermissions?.length || 0})
          </h3>
          <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
            {user.effectivePermissions?.map((perm) => (
              <span
                key={perm}
                className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
