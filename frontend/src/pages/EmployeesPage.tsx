import React, { useEffect, useState } from 'react';
import {
  IdCard,
  Plus,
  Search,
  FileText,
  X,
  Building2,
  Users2,
  Eye,
  ShieldCheck,
  FolderLock,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import {
  BranchInfo,
  DepartmentInfo,
  EmployeeProfile,
  ProductionTeamInfo,
} from '../types/crm';
import {
  EMPLOYEE_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  formatVND,
  getInitials,
  ROLE_LABELS,
  SCOPE_LABELS,
} from '../utils/formatters';

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

  // Slide-over 360° Profile Drawer
  const [selectedEmp, setSelectedEmp] = useState<EmployeeProfile | null>(null);

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
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <IdCard className="w-6 h-6 text-emerald-600" />
            Quản trị Hồ sơ Nhân sự 360° & Hợp đồng NAS Enterprise
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phạm vi phân quyền hiện tại:{' '}
            <strong className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {SCOPE_LABELS[user?.dataScope || ''] || user?.dataScope}
            </strong>{' '}
            — Click vào bất kỳ nhân sự nào để mở Hồ sơ 360° chi tiết
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Thêm Hồ sơ Nhân sự mới
          </button>
        )}
      </div>

      {/* Bộ lọc Chi nhánh - Phòng ban - Tổ chuyền */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
            placeholder="Tìm họ tên, mã NV, chức vụ..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold"
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
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold"
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
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold"
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Nhân sự</th>
                <th className="py-3.5 px-4">Đơn vị & Phòng ban</th>
                <th className="py-3.5 px-4">Tổ / Chuyền SX</th>
                <th className="py-3.5 px-4">Chức danh & Phân loại</th>
                <th className="py-3.5 px-4">Lương Hợp đồng & NAS PDF</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Đang tải hồ sơ nhân sự...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Không có hồ sơ nhân sự nào trong phạm vi hiển thị
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const activeContract = emp.contracts?.[0];
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmp(emp)}
                      className="cursor-pointer hover:bg-blue-50/40 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(emp.fullName)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {emp.employeeCode}
                              </span>
                              <span className="font-bold text-slate-900">
                                {emp.fullName}
                              </span>
                            </div>
                            {emp.user && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tài khoản: <strong>{emp.user.username}</strong> •{' '}
                                {ROLE_LABELS[emp.user.role] || emp.user.role}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-blue-700 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {emp.branch?.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {emp.department?.name}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        {emp.productionTeam ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 font-bold">
                            <Users2 className="w-3.5 h-3.5" />
                            {emp.productionTeam.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">Khối Văn Phòng</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{emp.positionTitle}</p>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {EMPLOYEE_TYPE_LABELS[emp.employeeType] || emp.employeeType} •{' '}
                          {EMPLOYMENT_STATUS_LABELS[emp.employmentStatus] ||
                            emp.employmentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {activeContract ? (
                          <div>
                            <p className="font-extrabold text-emerald-700">
                              {formatVND(activeContract.baseSalary)}
                            </p>
                            <p className="text-[10px] text-purple-700 font-mono truncate max-w-[210px]">
                              {activeContract.nasPdfPath}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Đã che bảo mật / Chưa tạo HĐ
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3.5 px-4 text-right space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedEmp(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> 360°
                        </button>
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
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            HĐ NAS
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

      {/* Slide-Over Drawer: Hồ sơ Nhân sự 360° */}
      {selectedEmp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedEmp(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 p-6 overflow-y-auto space-y-6"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-base flex items-center justify-center shadow-md">
                  {getInitials(selectedEmp.fullName)}
                </div>
                <div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedEmp.employeeCode}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    {selectedEmp.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedEmp.positionTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin Đơn vị & Phân quyền */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Đơn vị công tác & Tài khoản Hệ thống
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-slate-500">Chi nhánh:</span>
                  <p className="font-bold text-slate-900">{selectedEmp.branch?.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Phòng ban:</span>
                  <p className="font-bold text-slate-900">
                    {selectedEmp.department?.name}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Tổ / Chuyền SX:</span>
                  <p className="font-bold text-amber-800">
                    {selectedEmp.productionTeam?.name || 'Khối Văn Phòng'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Ổ đĩa mạng NAS:</span>
                  <p className="font-mono text-purple-700 font-semibold truncate">
                    {selectedEmp.department?.nasSharePath || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Thông tin Pháp lý & Ngân hàng */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Thông tin Định danh & Thanh toán Lương
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500">Số CCCD / Định danh:</span>
                  <p className="font-mono font-bold text-slate-900">
                    {selectedEmp.nationalId || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Mã số thuế TNCN:</span>
                  <p className="font-mono font-bold text-slate-900">
                    {selectedEmp.taxCode || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Tài khoản Ngân hàng:</span>
                  <p className="font-mono font-bold text-slate-900">
                    {selectedEmp.bankAccountNumber || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Ngân hàng:</span>
                  <p className="font-bold text-slate-900">
                    {selectedEmp.bankName || 'Vietcombank'}
                  </p>
                </div>
              </div>
            </div>

            {/* Hợp đồng lao động lưu trên NAS */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-2.5 text-xs">
              <p className="font-bold text-purple-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FolderLock className="w-4 h-4 text-purple-700" />
                Hợp đồng Lao động Lưu trữ trên NAS Enterprise
              </p>
              {selectedEmp.contracts && selectedEmp.contracts.length > 0 ? (
                selectedEmp.contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg bg-white border border-purple-200 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-800">
                        {c.contractNumber}
                      </span>
                      <span className="font-extrabold text-emerald-700">
                        {formatVND(c.baseSalary)} / tháng
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 break-all">
                      NAS Path: {c.nasPdfPath}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">
                  Không có hợp đồng hiển thị hoặc tài khoản không có quyền xem lương nhạy cảm.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Hồ sơ Nhân viên */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Hồ sơ Nhân viên mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Nhân viên</label>
                  <input
                    required
                    value={createForm.employeeCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, employeeCode: e.target.value })
                    }
                    placeholder="NV-HQ-0010 / CN-FAC1-0205"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    required
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chi nhánh</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng ban</label>
                  <select
                    value={createForm.departmentId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, departmentId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tổ / Chuyền SX (Nếu là Công nhân)
                  </label>
                  <select
                    value={createForm.productionTeamId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, productionTeamId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
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
                  <label className="block font-semibold text-slate-700 mb-1">Loại nhân sự</label>
                  <select
                    value={createForm.employeeType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        employeeType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    <option value="OFFICE_STAFF">Nhân viên Văn phòng (VLAN 30)</option>
                    <option value="FACTORY_WORKER">Công nhân Sản xuất (Tổ/Chuyền)</option>
                    <option value="EXECUTIVE">Ban Giám đốc / Quản lý</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chức danh công việc</label>
                  <input
                    required
                    value={createForm.positionTitle}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, positionTitle: e.target.value })
                    }
                    placeholder="Chuyên viên Thu mua / Công nhân May"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số CCCD</label>
                  <input
                    value={createForm.nationalId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nationalId: e.target.value })
                    }
                    placeholder="079099001234"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cập nhật Hợp đồng Lao động (NAS PDF)
                </h3>
                <p className="text-xs text-slate-500">
                  {contractModalEmp.employeeCode} — {contractModalEmp.fullName}
                </p>
              </div>
              <button onClick={() => setContractModalEmp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Hợp đồng</label>
                <input
                  required
                  value={contractForm.contractNumber}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, contractNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lương Hợp đồng (VNĐ)</label>
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
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phụ cấp tiền ăn (VNĐ)</label>
                  <input
                    type="number"
                    value={contractForm.mealAllowance}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        mealAllowance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Đường dẫn lưu trữ PDF trên NAS Enterprise (Chặn xóa + Snapshot 2h)
                </label>
                <input
                  value={contractForm.nasPdfPath}
                  onChange={(e) =>
                    setContractForm({ ...contractForm, nasPdfPath: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-purple-700 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setContractModalEmp(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold"
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
