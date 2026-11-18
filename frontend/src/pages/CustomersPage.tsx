import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  X,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import { BranchInfo } from '../types/crm';

export const CustomersPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    customerCode: '',
    branchId: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    taxCode: '',
    address: '',
    notes: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        apiClient.get('/erp/customers', { params: { search: search || undefined } }),
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
      ]);
      setCustomers(cRes.data.data || []);
      const bList = bRes.data.data || [];
      setBranches(bList);
      if (bList.length > 0 && !form.branchId) {
        setForm((prev) => ({ ...prev, branchId: user?.branch?.id || bList[0].id }));
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
      await apiClient.post('/erp/customers', form);
      setShowCreateModal(false);
      setForm((prev) => ({
        ...prev,
        customerCode: '',
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        taxCode: '',
        address: '',
        notes: '',
      }));
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tạo khách hàng');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Quản lý Khách hàng & Đối tác Kinh doanh (Sales CRM)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh bạ đối tác B2B, mã số thuế, đầu mối liên hệ và nhân sự kinh doanh phụ trách
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Thêm Khách hàng B2B mới
        </button>
      </div>

      {/* Tìm kiếm */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
            placeholder="Tìm theo tên công ty, mã KH, người liên hệ, số điện thoại..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900"
          />
        </div>
        <button
          onClick={fetchAll}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          Tìm kiếm
        </button>
      </div>

      {/* Grid thẻ Khách hàng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400">
            Đang tải danh sách khách hàng...
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {c.customerCode}
                </span>
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {c.branch?.name}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{c.companyName}</h3>
                {c.taxCode && (
                  <p className="text-xs text-slate-500 font-mono">MST: {c.taxCode}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  {c.phone || 'Chưa cập nhật'} ({c.contactPerson || 'N/A'})
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  {c.email || 'Chưa cập nhật'}
                </p>
                {c.address && (
                  <p className="sm:col-span-2 flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {c.address}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Thêm KH */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Thêm Hồ sơ Khách hàng / Đối tác mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Công ty / Đối tác
                </label>
                <input
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã số thuế</label>
                  <input
                    value={form.taxCode}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người liên hệ</label>
                  <input
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Điện thoại</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  Lưu Khách Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
