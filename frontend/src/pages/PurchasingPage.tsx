import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  X,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import { BranchInfo, DepartmentInfo } from '../types/crm';
import { formatVND, PURCHASE_STATUS_META } from '../utils/formatters';

export const PurchasingPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [requests, setRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    departmentId: '',
    title: '',
    supplierName: '',
    items: [
      { itemName: 'Vải Cotton 100% 4 chiều', unit: 'Mét', quantity: 500, unitPrice: 65000 },
    ],
  });

  const canApprove =
    user?.role === 'SUPER_ADMIN' ||
    user?.effectivePermissions?.includes('purchasing:approve');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, dRes] = await Promise.all([
        apiClient.get('/erp/purchase-requests'),
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
      ]);
      setRequests(pRes.data.data || []);
      const bList = bRes.data.data || [];
      const dList = dRes.data.data || [];
      setBranches(bList);
      setDepartments(dList);

      if (bList.length > 0 && !form.branchId) {
        const defaultB = user?.branch?.id || bList[0].id;
        const firstD = dList.find((d: DepartmentInfo) => d.branchId === defaultB);
        setForm((prev) => ({
          ...prev,
          branchId: defaultB,
          departmentId: firstD?.id || '',
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
      await apiClient.post('/erp/purchase-requests', form);
      setShowCreateModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo đơn thu mua');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/erp/purchase-requests/${id}/status`, { status });
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái đơn');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-amber-600" />
            Bộ phận Thu mua & Phê duyệt Cung ứng Vật tư (Procurement)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình mua sắm nội bộ: Đề xuất vật tư → Kế toán/Giám đốc phê duyệt chi → Đặt hàng NCC → Nhập kho
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-amber-600/20"
        >
          <Plus className="w-4 h-4" />
          Tạo Phiếu Đề Nghị Mua Hàng (PO)
        </button>
      </div>

      {/* Danh sách đơn thu mua */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Đang tải danh sách đơn thu mua...
          </div>
        ) : (
          requests.map((po) => {
            const meta =
              PURCHASE_STATUS_META[po.status] || PURCHASE_STATUS_META.PENDING_APPROVAL;
            const items = Array.isArray(po.itemsJson) ? po.itemsJson : [];

            return (
              <div
                key={po.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {po.requestCode}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-blue-700 font-semibold">
                        {po.branch?.name} ({po.department?.name})
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{po.title}</h3>
                    <p className="text-xs text-slate-500">
                      Nhà cung cấp: <strong className="text-slate-700">{po.supplierName}</strong> • Người đề xuất:{' '}
                      <strong className="text-slate-700">{po.requester?.fullName}</strong>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500 font-medium">Tổng dự toán PO</p>
                    <p className="text-xl font-extrabold text-emerald-700">
                      {formatVND(po.totalEstimatedAmount)}
                    </p>
                  </div>
                </div>

                {/* Chi tiết mặt hàng */}
                {items.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Tên vật tư / Nguyên phụ liệu</th>
                          <th className="py-2 px-3 text-center">ĐVT</th>
                          <th className="py-2 px-3 text-right">Số lượng</th>
                          <th className="py-2 px-3 text-right">Đơn giá</th>
                          <th className="py-2 px-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {item.itemName}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {Number(item.quantity).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {formatVND(item.unitPrice)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              {formatVND(Number(item.quantity) * Number(item.unitPrice))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Nút phê duyệt quy trình */}
                {canApprove && (
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    {po.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(po.id, 'APPROVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Phê duyệt chi
                        </button>
                        <button
                          onClick={() => handleStatusChange(po.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </>
                    )}
                    {po.status === 'APPROVED' && (
                      <button
                        onClick={() => handleStatusChange(po.id, 'ORDERED')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" /> Xác nhận Đã đặt hàng NCC
                      </button>
                    )}
                    {po.status === 'ORDERED' && (
                      <button
                        onClick={() => handleStatusChange(po.id, 'RECEIVED')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Xác nhận Đã nhập kho đủ
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tạo PO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Lập Phiếu Đề Nghị Thu Mua Vật Tư (PO)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung / Mục đích mua hàng
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Mua chỉ may công nghiệp & nhãn dệt cho Chuyền May 01"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chi nhánh</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => {
                      const nextB = e.target.value;
                      const firstD = departments.find((d) => d.branchId === nextB);
                      setForm({
                        ...form,
                        branchId: nextB,
                        departmentId: firstD?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng ban đề xuất</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {departments
                      .filter((d) => !form.branchId || d.branchId === form.branchId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhà cung cấp</label>
                  <input
                    required
                    value={form.supplierName}
                    onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                    placeholder="Tên công ty cung ứng..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Danh mục mặt hàng cần mua:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        items: [
                          ...form.items,
                          { itemName: '', unit: 'Cái', quantity: 100, unitPrice: 10000 },
                        ],
                      })
                    }
                    className="text-blue-600 font-bold hover:underline"
                  >
                    + Thêm dòng vật tư
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      required
                      placeholder="Tên vật tư"
                      value={item.itemName}
                      onChange={(e) => {
                        const next = [...form.items];
                        next[idx].itemName = e.target.value;
                        setForm({ ...form, items: next });
                      }}
                      className="col-span-5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300"
                    />
                    <input
                      required
                      placeholder="ĐVT"
                      value={item.unit}
                      onChange={(e) => {
                        const next = [...form.items];
                        next[idx].unit = e.target.value;
                        setForm({ ...form, items: next });
                      }}
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300"
                    />
                    <input
                      type="number"
                      required
                      placeholder="SL"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...form.items];
                        next[idx].quantity = Number(e.target.value);
                        setForm({ ...form, items: next });
                      }}
                      className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Đơn giá"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const next = [...form.items];
                        next[idx].unitPrice = Number(e.target.value);
                        setForm({ ...form, items: next });
                      }}
                      className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300"
                    />
                  </div>
                ))}
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
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Gửi Yêu Cầu Phê Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
