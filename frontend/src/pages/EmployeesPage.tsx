import React, { useEffect, useState } from 'react';
import {
  IdCard,
  Plus,
  Search,
  FileText,
  X,
  Building2,
  Users2,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import {
  BranchInfo,
  DepartmentInfo,
  EmployeeProfile,
  ProductionTeamInfo,
} from '../types/crm';

export const EmployeesPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [teams, setTeams] = useState<ProductionTeamInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [productionTeamId, setProductionTeamId] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeCode: '',
    fullName: '',
    positionTitle: '',
    branchId: '',
    departmentId: '',
    productionTeamId: '',
    employeeType: 'OFFICE_STAFF' as 'OFFICE_STAFF' | 'FACTORY_WORKER' | 'EXECUTIVE',
    phone: '',
    nationalId: '',
    bankAccountNumber: '',
    bankName: 'Vietcombank',
  });

  const [contractModalEmp, setContractModalEmp] = useState<EmployeeProfile | null>(null);
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    contractType: 'INDEFINITE',
    startDate: '2026-01-01',
    baseSalary: 12000000,
    insuranceSalary: 9600000,
    mealAllowance: 730000,
    nasPdfPath: '',
  });

  const canCreate =
    user?.role === 'SUPER_ADMIN' ||
    user?.effectivePermissions?.includes('employees:create');

  const canManageContract =
    user?.role === 'SUPER_ADMIN' ||
    user?.effectivePermissions?.includes('contracts:manage');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, branchRes, deptRes, teamRes] = await Promise.all([
        apiClient.get('/employees', {
          params: {
            search: search || undefined,
            branchId: branchId || undefined,
            departmentId: departmentId || undefined,
            productionTeamId: productionTeamId || undefined,
          },
        }),
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/production-teams').catch(() => ({ data: { data: [] } })),
      ]);

      setEmployees(empRes.data.data || []);
      const bList = branchRes.data.data || [];
      const dList = deptRes.data.data || [];
      setBranches(bList);
      setDepartments(dList);
      setTeams(teamRes.data.data || []);

      if (bList.length > 0 && !createForm.branchId) {
        const defaultBranchId = bList[0].id;
        const firstDept = dList.find((d: DepartmentInfo) => d.branchId === defaultBranchId);
        setCreateForm((prev) => ({
          ...prev,
          branchId: defaultBranchId,
          departmentId: firstDept?.id || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [branchId, departmentId, productionTeamId]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/employees', {
        ...createForm,
        productionTeamId: createForm.productionTeamId || null,
      });
      setShowCreateModal(false);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tạo hồ sơ nhân viên');
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractModalEmp) return;
    try {
      await apiClient.post(`/employees/${contractModalEmp.id}/contracts`, contractForm);
      setContractModalEmp(null);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tạo hợp đồng');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <IdCard className="w-5 h-5 text-emerald-400" />
            Quản trị Hồ sơ Nhân viên (Đa Chi Nhánh & Tổ/Chuyền)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Phạm vi hiện tại của bạn: <strong className="text-amber-300">{user?.dataScope}</strong> — Dữ liệu nhân sự tự động cô lập theo Chi nhánh & quyền nhạy cảm
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Thêm Hồ sơ Nhân viên
          </button>
        )}
      </div>

      {/* Bộ lọc Chi nhánh - Phòng ban - Tổ chuyền */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
            placeholder="Tìm họ tên, mã NV, chức vụ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          />
        </div>

        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
        >
          <option value="">-- Tất cả Chi nhánh được phép --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </select>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
        >
          <option value="">-- Tất cả Phòng ban --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>

        <select
          value={productionTeamId}
          onChange={(e) => setProductionTeamId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
        >
          <option value="">-- Tất cả Tổ / Chuyền --</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} — {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Danh sách Hồ sơ Nhân viên */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Mã NV & Họ tên</th>
                <th className="py-3.5 px-4">Chi nhánh & Phòng ban</th>
                <th className="py-3.5 px-4">Tổ / Chuyền SX</th>
                <th className="py-3.5 px-4">Phân loại & Chức danh</th>
                <th className="py-3.5 px-4">Hợp đồng & Lương HĐ</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Đang tải hồ sơ nhân sự...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không có hồ sơ nhân sự nào trong phạm vi hiển thị
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const activeContract = emp.contracts?.[0];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {emp.employeeCode}
                          </span>
                          <span className="font-semibold text-white">{emp.fullName}</span>
                        </div>
                        {emp.user && (
                          <p className="text-[11px] text-slate-400 font-mono mt-1">
                            User: {emp.user.username} ({emp.user.role})
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-blue-300 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {emp.branch?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {emp.department?.name} ({emp.department?.nasSharePath || 'NAS'})
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {emp.productionTeam ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 font-medium">
                            <Users2 className="w-3.5 h-3.5" />
                            {emp.productionTeam.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">Khối Văn Phòng</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-200">{emp.positionTitle}</p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {emp.employeeType} • {emp.employmentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {activeContract ? (
                          <div>
                            <p className="font-semibold text-emerald-400">
                              {Number(activeContract.baseSalary).toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[210px]">
                              {activeContract.nasPdfPath}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">
                            Ẩn hoặc chưa có HĐ
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canManageContract && (
                          <button
                            onClick={() => {
                              setContractModalEmp(emp);
                              setContractForm({
                                contractNumber: `HDLD-2026-${emp.employeeCode}`,
                                contractType: 'INDEFINITE',
                                startDate: '2026-01-01',
                                baseSalary: 12000000,
                                insuranceSalary: 9600000,
                                mealAllowance: 730000,
                                nasPdfPath: `\\\\10.10.20.250\\NhanSu\\HopDong\\2026\\HDLD-2026-${emp.employeeCode}.pdf`,
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Hợp đồng NAS
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Hồ sơ Nhân viên */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Thêm Hồ sơ Nhân viên mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Mã Nhân viên</label>
                  <input
                    required
                    value={createForm.employeeCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, employeeCode: e.target.value })
                    }
                    placeholder="NV-HQ-0010 / CN-FAC1-0205"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Họ và tên</label>
                  <input
                    required
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Chi nhánh</label>
                  <select
                    value={createForm.branchId}
                    onChange={(e) => {
                      const nextB = e.target.value;
                      const firstD = departments.find((d) => d.branchId === nextB);
                      setCreateForm({
                        ...createForm,
                        branchId: nextB,
                        departmentId: firstD?.id || '',
                        productionTeamId: '',
                      });
                    }}
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
                  <label className="block text-slate-300 mb-1">Phòng ban</label>
                  <select
                    value={createForm.departmentId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {departments
                      .filter((d) => !createForm.branchId || d.branchId === createForm.branchId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">
                    Tổ / Chuyền SX (Nếu là Công nhân)
                  </label>
                  <select
                    value={createForm.productionTeamId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, productionTeamId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">-- Không thuộc Tổ/Chuyền (Văn phòng) --</option>
                    {teams
                      .filter((t) => !createForm.branchId || t.branchId === createForm.branchId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Loại nhân sự</label>
                  <select
                    value={createForm.employeeType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        employeeType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="OFFICE_STAFF">Nhân viên Văn phòng (VLAN 30)</option>
                    <option value="FACTORY_WORKER">Công nhân Sản xuất (Tổ/Chuyền)</option>
                    <option value="EXECUTIVE">Ban Giám đốc / Quản lý</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Chức danh công việc</label>
                  <input
                    required
                    value={createForm.positionTitle}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, positionTitle: e.target.value })
                    }
                    placeholder="Chuyên viên Thu mua / Công nhân May"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Số CCCD</label>
                  <input
                    value={createForm.nationalId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nationalId: e.target.value })
                    }
                    placeholder="079099001234"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Lưu Hồ sơ Nhân viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo Hợp đồng Lao động & Lưu đường dẫn NAS */}
      {contractModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Cập nhật Hợp đồng Lao động (NAS PDF)
                </h3>
                <p className="text-xs text-slate-400">
                  {contractModalEmp.employeeCode} — {contractModalEmp.fullName}
                </p>
              </div>
              <button onClick={() => setContractModalEmp(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Số Hợp đồng</label>
                <input
                  required
                  value={contractForm.contractNumber}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, contractNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Lương Hợp đồng (VNĐ)</label>
                  <input
                    type="number"
                    required
                    value={contractForm.baseSalary}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        baseSalary: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phụ cấp tiền ăn (VNĐ)</label>
                  <input
                    type="number"
                    value={contractForm.mealAllowance}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        mealAllowance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Đường dẫn lưu trữ PDF trên NAS Enterprise (Chặn xóa + Snapshot 2h)
                </label>
                <input
                  value={contractForm.nasPdfPath}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, nasPdfPath: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-purple-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setContractModalEmp(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Lưu Hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
