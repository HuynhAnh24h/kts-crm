import React, { useEffect, useState } from 'react';
import {
  Factory,
  Plus,
  Users2,
  Calendar,
  TrendingUp,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { BranchInfo, ProductionTeamInfo } from '../types/crm';

export const ProductionPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [teams, setTeams] = useState<ProductionTeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    planCode: '',
    branchId: '',
    productionTeamId: '',
    productName: '',
    targetQuantity: 2000,
    startDate: '2026-11-18',
    endDate: '2026-12-15',
    notes: '',
  });

  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [completedQty, setCompletedQty] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, tRes] = await Promise.all([
        apiClient.get('/erp/production-plans'),
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/production-teams').catch(() => ({ data: { data: [] } })),
      ]);
      setPlans(pRes.data.data || []);
      const bList = bRes.data.data || [];
      const tList = tRes.data.data || [];
      setBranches(bList);
      setTeams(tList);

      if (tList.length > 0 && !form.productionTeamId) {
        setForm((prev) => ({
          ...prev,
          branchId: tList[0].branchId,
          productionTeamId: tList[0].id,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/erp/production-plans', form);
      setShowCreateModal(false);
      setForm((prev) => ({ ...prev, planCode: '', productName: '', notes: '' }));
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo lệnh sản xuất');
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await apiClient.patch(`/erp/production-plans/${editingPlan.id}/progress`, {
        completedQuantity: completedQty,
      });
      setEditingPlan(null);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật tiến độ');
    }
  };

  const totalTarget = plans.reduce((s, p) => s + Number(p.targetQuantity), 0);
  const totalCompleted = plans.reduce((s, p) => s + Number(p.completedQuantity), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="w-6 h-6 text-blue-600" />
            Kế hoạch Sản xuất & Điều độ Tổ / Chuyền tại Nhà Xưởng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giao chỉ tiêu sản lượng xuống từng Tổ / Chuyền và cập nhật tiến độ hoàn thành theo ca sản xuất
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Phát hành Lệnh Sản Xuất mới
        </button>
      </div>

      {/* Thẻ chỉ số sản xuất */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Tổng Lệnh Sản Xuất Đang Chạy</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {plans.length} lệnh sản xuất
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200">
          <p className="text-xs font-semibold text-blue-800">Tổng Sản Lượng Đã Hoàn Thành</p>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">
            {totalCompleted.toLocaleString('vi-VN')} / {totalTarget.toLocaleString('vi-VN')} SP
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-800">Tỷ Lệ Hoàn Thành Kế Hoạch</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {overallPct}% toàn xưởng
          </p>
        </div>
      </div>

      {/* Danh sách Lệnh sản xuất */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400">
            Đang tải kế hoạch sản xuất...
          </div>
        ) : (
          plans.map((p) => {
            const pct = Math.min(
              100,
              Math.round((p.completedQuantity / (p.targetQuantity || 1)) * 100)
            );
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {p.planCode}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Users2 className="w-3.5 h-3.5" />
                        {p.productionTeam?.name}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {p.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang sản xuất'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {p.productName}
                    </h3>
                    {p.notes && (
                      <p className="text-xs text-slate-500 mt-1">{p.notes}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        Tiến độ sản lượng:
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {p.completedQuantity.toLocaleString('vi-VN')} /{' '}
                        {p.targetQuantity.toLocaleString('vi-VN')} sản phẩm ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(p.startDate).toLocaleDateString('vi-VN')} →{' '}
                    {new Date(p.endDate).toLocaleDateString('vi-VN')}
                  </span>

                  <button
                    onClick={() => {
                      setEditingPlan(p);
                      setCompletedQty(p.completedQuantity);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Cập nhật sản lượng
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tạo Lệnh SX */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Phát hành Lệnh Sản Xuất Mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên mặt hàng / Lô sản xuất
                </label>
                <input
                  required
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="VD: Áo Sơ Mi Dài Tay Xuất Khẩu Hàn Quốc"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tổ / Chuyền thực hiện
                  </label>
                  <select
                    value={form.productionTeamId}
                    onChange={(e) => {
                      const t = teams.find((item) => item.id === e.target.value);
                      setForm({
                        ...form,
                        productionTeamId: e.target.value,
                        branchId: t?.branchId || form.branchId,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sản lượng chỉ tiêu (SP)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.targetQuantity}
                    onChange={(e) =>
                      setForm({ ...form, targetQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày hoàn thành</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú kỹ thuật</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Phát Hành Lệnh SX
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cập nhật sản lượng hoàn thành */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cập nhật Sản lượng Hoàn thành
                </h3>
                <p className="text-xs text-slate-500">{editingPlan.planCode}</p>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sản lượng lũy kế đã hoàn thành (Chỉ tiêu:{' '}
                  {editingPlan.targetQuantity.toLocaleString('vi-VN')} SP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={completedQty}
                  onChange={(e) => setCompletedQty(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-base font-extrabold text-blue-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" /> Lưu Tiến Độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
