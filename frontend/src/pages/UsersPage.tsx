import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  Lock,
  Unlock,
  Search,
  MailCheck,
  X,
  Check,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import {
  BranchInfo,
  DataScope,
  RbacMatrixResponse,
  RoleCode,
  UserAccount,
} from '../types/crm';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [matrix, setMatrix] = useState<RbacMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    username: '',
    password: 'Kts@2026',
    role: 'OFFICE_STAFF' as RoleCode,
    dataScope: 'OWN_BRANCH' as DataScope,
    branchId: '',
    twoFactorEnabled: true,
  });

  // Modal phân quyền RBAC chuyên sâu
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [rbacForm, setRbacForm] = useState({
    role: 'OFFICE_STAFF' as RoleCode,
    dataScope: 'OWN_BRANCH' as DataScope,
    customPermissions: [] as string[],
    revokedPermissions: [] as string[],
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes, matrixRes] = await Promise.all([
        apiClient.get('/users', {
          params: {
            search: search || undefined,
            branchId: branchFilter || undefined,
            role: roleFilter || undefined,
          },
        }),
        apiClient.get('/organization/branches'),
        apiClient.get('/users/rbac-matrix'),
      ]);
      setUsers(usersRes.data.data || []);
      const bList = branchesRes.data.data || [];
      setBranches(bList);
      if (bList.length > 0 && !createForm.branchId) {
        setCreateForm((prev) => ({ ...prev, branchId: bList[0].id }));
      }
      setMatrix(matrixRes.data.data || null);
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [branchFilter, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/users', createForm);
      setShowCreateModal(false);
      setFeedback('✅ Đã tạo tài khoản mới thành công!');
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo tài khoản');
    }
  };

  const openRbacModal = (u: UserAccount) => {
    setEditingUser(u);
    setRbacForm({
      role: u.role,
      dataScope: u.dataScope,
      customPermissions: u.customPermissions || [],
      revokedPermissions: u.revokedPermissions || [],
    });
  };

  const handleSaveRbac = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await apiClient.patch(`/users/${editingUser.id}/permissions`, rbacForm);
      setEditingUser(null);
      setFeedback(`✅ Đã cập nhật phân quyền RBAC cho ${editingUser.username}`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật phân quyền');
    }
  };

  const handleToggleLock = async (u: UserAccount) => {
    const nextStatus = u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      await apiClient.patch(`/users/${u.id}`, { status: nextStatus });
      setFeedback(`✅ Đã chuyển trạng thái ${u.username} sang ${nextStatus}`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể đổi trạng thái');
    }
  };

  const handleToggle2FA = async (u: UserAccount) => {
    try {
      await apiClient.patch(`/users/${u.id}`, {
        twoFactorEnabled: !u.twoFactorEnabled,
      });
      setFeedback(
        `✅ Đã ${!u.twoFactorEnabled ? 'bật' : 'tắt'} bảo mật 2FA Google Mail cho ${u.username}`
      );
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật 2FA');
    }
  };

  const toggleCustomPerm = (perm: string) => {
    setRbacForm((prev) => ({
      ...prev,
      customPermissions: prev.customPermissions.includes(perm)
        ? prev.customPermissions.filter((p) => p !== perm)
        : [...prev.customPermissions, perm],
      revokedPermissions: prev.revokedPermissions.filter((p) => p !== perm),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Quản trị Tài khoản & Phân quyền Đa Chi Nhánh (RBAC)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý tài khoản AD/LDAP, phân quyền theo Chi nhánh (HQ vs Nhà xưởng), bật/tắt 2FA Google Mail
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-blue-600/25"
        >
          <Plus className="w-4 h-4" />
          Tạo Tài khoản mới
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
            placeholder="Tìm theo username, email, mã nhân viên..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
        >
          <option value="">-- Tất cả Chi nhánh --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
        >
          <option value="">-- Tất cả Vai trò (Role) --</option>
          {matrix?.roles.map((r) => (
            <option key={r.code} value={r.code}>
              {r.code} — {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bảng danh sách User */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Tài khoản & Nhân sự</th>
                <th className="py-3.5 px-4">Chi nhánh</th>
                <th className="py-3.5 px-4">Vai trò (Role) & NAS</th>
                <th className="py-3.5 px-4">Phạm vi (Scope)</th>
                <th className="py-3.5 px-4">2FA Gmail</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác quản trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy tài khoản nào phù hợp
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">
                        {u.employee?.fullName || u.username}
                      </p>
                      <p className="text-slate-400 font-mono text-[11px]">
                        {u.email} ({u.username})
                      </p>
                      {u.employee && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Mã NV: {u.employee.employeeCode} • {u.employee.positionTitle}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {u.branch?.code}
                      </span>
                      <p className="text-slate-400 mt-1 text-[11px]">{u.branch?.name}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">
                        {u.roleInfo?.name || u.role}
                      </p>
                      <p className="text-[11px] text-purple-300 mt-0.5">
                        NAS: {u.roleInfo?.nasFolderGroup} • {u.effectivePermissions?.length} quyền
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          u.dataScope === 'ALL_BRANCHES'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : u.dataScope === 'OWN_BRANCH'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {u.dataScope}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle2FA(u)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 border ${
                          u.twoFactorEnabled
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <MailCheck className="w-3.5 h-3.5" />
                        {u.twoFactorEnabled ? 'Đang Bật' : 'Đang Tắt'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openRbacModal(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Phân quyền
                      </button>
                      <button
                        onClick={() => handleToggleLock(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 inline-flex items-center gap-1"
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-rose-400" /> Khóa
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Mở
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Tài Khoản */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tạo Tài khoản Người dùng mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Username (AD/LDAP)</label>
                  <input
                    required
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    placeholder="nv.thumua01"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email (Nhận OTP 2FA)</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="nv.thumua01@kts.local"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Chi nhánh trực thuộc</label>
                  <select
                    value={createForm.branchId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, branchId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Mật khẩu khởi tạo</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Vai trò (Role)</label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        role: e.target.value as RoleCode,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {matrix?.roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phạm vi dữ liệu (Scope)</label>
                  <select
                    value={createForm.dataScope}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        dataScope: e.target.value as DataScope,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {matrix?.dataScopes.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.twoFactorEnabled}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      twoFactorEnabled: e.target.checked,
                    })
                  }
                />
                <span className="text-slate-200">
                  Bật xác thực bảo mật 2 lớp (2FA OTP) qua Google Mail
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Khởi tạo Tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phân quyền RBAC chuyên sâu */}
      {editingUser && matrix && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Phân quyền RBAC & Phạm vi Chi nhánh: {editingUser.username}
                </h3>
                <p className="text-xs text-slate-400">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRbac} className="space-y-4 text-xs overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Vai trò chính (Role)
                  </label>
                  <select
                    value={rbacForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as RoleCode;
                      const found = matrix.roles.find((r) => r.code === nextRole);
                      setRbacForm({
                        ...rbacForm,
                        role: nextRole,
                        dataScope: found?.defaultScope || rbacForm.dataScope,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {matrix.roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Phạm vi Cô lập Dữ liệu (DataScope)
                  </label>
                  <select
                    value={rbacForm.dataScope}
                    onChange={(e) =>
                      setRbacForm({
                        ...rbacForm,
                        dataScope: e.target.value as DataScope,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {matrix.dataScopes.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} — {s.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-slate-300 font-semibold mb-2">
                  Cấp thêm Quyền bổ sung cá biệt (Custom Permissions ngoài Role):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {matrix.permissions.map((perm) => {
                    const isDefaultInRole = matrix.roles
                      .find((r) => r.code === rbacForm.role)
                      ?.permissions.includes(perm);
                    const isCustom = rbacForm.customPermissions.includes(perm);

                    return (
                      <button
                        type="button"
                        key={perm}
                        onClick={() => !isDefaultInRole && toggleCustomPerm(perm)}
                        className={`text-left px-2.5 py-1.5 rounded-lg border font-mono text-[11px] flex items-center justify-between ${
                          isDefaultInRole
                            ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                            : isCustom
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{perm}</span>
                        {(isDefaultInRole || isCustom) && (
                          <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Lưu Cấu hình Phân quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
