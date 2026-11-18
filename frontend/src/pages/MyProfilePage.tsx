import React, { useEffect, useState } from 'react';
import { UserCircle, Save, KeyRound, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { EmployeeProfile } from '../types/crm';

export const MyProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [form, setForm] = useState({
    phone: '',
    personalEmail: '',
    currentAddress: '',
    bankAccountNumber: '',
    bankName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get('/employees/me')
      .then((res) => {
        const p: EmployeeProfile = res.data.data;
        setProfile(p);
        setForm({
          phone: p.phone || '',
          personalEmail: p.personalEmail || '',
          currentAddress: p.currentAddress || '',
          bankAccountNumber: p.bankAccountNumber || '',
          bankName: p.bankName || '',
          emergencyContactName: p.emergencyContactName || '',
          emergencyContactPhone: p.emergencyContactPhone || '',
        });
      })
      .catch(() => null);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.patch('/employees/me', form);
      setProfile(res.data.data);
      setMsg('✅ Đã cập nhật thông tin liên hệ cá nhân thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật hồ sơ');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/change-password', pwForm);
      setPwForm({ currentPassword: '', newPassword: '' });
      setMsg('✅ Đổi mật khẩu thành công!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-blue-600" />
          Hồ sơ Cá nhân & Bảo mật Tài khoản
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Xem thông tin nhân sự, hợp đồng lao động và cập nhật thông tin liên hệ cá nhân
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
            <div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {profile.employeeCode}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{profile.fullName}</h2>
              <p className="text-xs text-slate-500">
                {profile.positionTitle} • {profile.department?.name} ({profile.branch?.name})
              </p>
            </div>
            {profile.productionTeam && (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                Tổ / Chuyền: {profile.productionTeam.name}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số điện thoại cá nhân</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email cá nhân</label>
              <input
                type="email"
                value={form.personalEmail}
                onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số tài khoản nhận lương</label>
              <input
                value={form.bankAccountNumber}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngân hàng</label>
              <input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Địa chỉ hiện tại</label>
              <input
                value={form.currentAddress}
                onChange={(e) => setForm({ ...form, currentAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Lưu Hồ sơ Cá nhân
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Đổi mật khẩu */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-600" />
          Đổi mật khẩu tài khoản
        </h3>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mật khẩu mới (Tối thiểu 8 ký tự, có chữ hoa & số)
            </label>
            <input
              type="password"
              required
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
          >
            Cập nhật Mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
};
