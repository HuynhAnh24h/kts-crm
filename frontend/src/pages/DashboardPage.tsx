import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IdCard,
  ShieldCheck,
  FolderLock,
  Layers,
  Factory,
  ShoppingCart,
  KanbanSquare,
  Banknote,
  History,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import { formatVND, ROLE_LABELS, SCOPE_LABELS } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/erp/dashboard-stats')
      .then((res) => setStats(res.data.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Executive Welcome Hero */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              TRUNG TÂM ĐIỀU HÀNH ĐA CHI NHÁNH
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              {SCOPE_LABELS[user.dataScope] || user.dataScope}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Xin chào, {user.employee?.fullName || user.username}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Chức vụ: <strong className="text-white">{ROLE_LABELS[user.role] || user.role}</strong> • Đơn vị:{' '}
            <strong className="text-amber-300">{user.branch?.name}</strong>. Mọi dữ liệu nhân sự, chấm công, bảng lương, kế hoạch sản xuất và thu mua bên dưới được đồng bộ theo phạm vi phân quyền của bạn.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 shrink-0">
          <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
            <p className="text-[11px] text-slate-300">Phân vùng ổ đĩa mạng NAS</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              <FolderLock className="w-4 h-4 text-amber-300" />
              {user.roleInfo?.nasFolderGroup || 'Dùng chung'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/15">
            <p className="text-[11px] text-slate-300">Quyền hạn RBAC</p>
            <p className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              {user.effectivePermissions?.length || 0} quyền được cấp
            </p>
          </div>
        </div>
      </div>

      {/* 4 Core Enterprise KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/employees')}
          className="cursor-pointer group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <IdCard className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Tổng Nhân sự & Hợp đồng</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats?.hrMetrics?.totalEmployees ?? 0} nhân sự
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Văn phòng: <strong>{stats?.hrMetrics?.officeStaffCount ?? 0}</strong></span>
            <span>Xưởng SX: <strong>{stats?.hrMetrics?.factoryWorkerCount ?? 0}</strong></span>
            <span className="text-emerald-700 font-semibold">
              {stats?.hrMetrics?.activeContractsCount ?? 0} HĐ
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/attendance-payroll')}
          className="cursor-pointer group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Quỹ Lương Thực Lãnh (Kỳ 11/2026)</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {formatVND(stats?.payrollSummary?.totalNetPay)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Tổng Gross: <strong>{formatVND(stats?.payrollSummary?.totalGross)}</strong></span>
            <span>{stats?.payrollSummary?.headcount ?? 0} phiếu</span>
          </div>
        </div>

        <div
          onClick={() => navigate('/tasks')}
          className="cursor-pointer group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <KanbanSquare className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Công việc Văn phòng (Kanban)</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stats?.taskBreakdown?.total ?? 0} đầu việc
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-amber-700 font-semibold">
              Đang làm: {stats?.taskBreakdown?.inProgress ?? 0}
            </span>
            <span className="text-emerald-700 font-semibold">
              Hoàn thành: {stats?.taskBreakdown?.completed ?? 0}
            </span>
          </div>
        </div>

        <div
          onClick={() => navigate('/purchasing')}
          className="cursor-pointer group p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Thu mua Vật tư & Cung ứng</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {formatVND(stats?.purchasingBreakdown?.totalEstimatedValue)}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="text-amber-700 font-semibold">
              Chờ duyệt: {stats?.purchasingBreakdown?.pendingApproval ?? 0} đơn
            </span>
            <span className="text-emerald-700 font-semibold">
              Đã duyệt: {stats?.purchasingBreakdown?.approved ?? 0} đơn
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Production Plan Progress + Recent Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tiến độ Kế hoạch Sản xuất theo Tổ/Chuyền */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Factory className="w-4 h-4 text-blue-600" />
                Tiến độ Lệnh Sản Xuất theo Tổ / Chuyền tại Nhà Xưởng
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi trực tiếp sản lượng hoàn thành so với chỉ tiêu giao xuống từng chuyền
              </p>
            </div>
            <button
              onClick={() => navigate('/production-plans')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Xem tất cả →
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Đang tải tiến độ sản xuất...</p>
          ) : (stats?.productionPlans || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Chưa có lệnh sản xuất nào</p>
          ) : (
            <div className="space-y-3.5">
              {stats.productionPlans.map((plan: any) => {
                const pct = Math.min(
                  100,
                  Math.round((plan.completedQuantity / (plan.targetQuantity || 1)) * 100)
                );
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {plan.planCode}
                          </span>
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {plan.productionTeam?.name}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 mt-1">
                          {plan.productName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-slate-900">
                          {plan.completedQuantity.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {' '}
                          / {plan.targetQuantity.toLocaleString('vi-VN')} SP ({pct}%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nhật ký hoạt động gần đây */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Nhật ký Thao tác Hệ thống gần đây
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi vết bảo mật thời gian thực (Audit Trail)
              </p>
            </div>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Chi tiết →
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {(stats?.recentAuditLogs || []).map((log: any) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      {log.module}
                    </span>
                    <span className="font-bold text-slate-800 truncate">
                      {log.action}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bởi: <strong>{log.user?.username || 'System'}</strong> •{' '}
                    {log.branch?.code || 'HQ'}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Multi-Branch Network Infrastructure Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Hạ tầng Mạng Nội Bộ Đa Chi Nhánh (Hub & Spoke Topology)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(stats?.branches || []).map((b: any) => (
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  LAN: {b.subnetCidr} • VLAN 30 (Office): {b.officeVlanCidr} • VLAN 40 (IoT): {b.iotVlanCidr}
                </p>
              </div>
              {b._count && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    {b._count.departments} Phòng ban
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    {b._count.productionTeams} Tổ/Chuyền
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                    {b._count.employees} Nhân sự
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
