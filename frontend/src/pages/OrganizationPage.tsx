import React, { useEffect, useState } from 'react';
import {
  Building2,
  FolderLock,
  Users2,
  Plus,
  Network,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import {
  BranchInfo,
  DepartmentInfo,
  ProductionTeamInfo,
} from '../types/crm';

export const OrganizationPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [teams, setTeams] = useState<ProductionTeamInfo[]>([]);

  const [newTeam, setNewTeam] = useState({
    branchId: '',
    departmentId: '',
    code: '',
    name: '',
    leaderName: '',
  });

  const loadAll = async () => {
    const [bRes, dRes, tRes] = await Promise.all([
      apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
      apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
      apiClient.get('/organization/production-teams').catch(() => ({ data: { data: [] } })),
    ]);
    const bList = bRes.data.data || [];
    const dList = dRes.data.data || [];
    setBranches(bList);
    setDepartments(dList);
    setTeams(tRes.data.data || []);

    if (bList.length > 0 && !newTeam.branchId) {
      const bId = bList[bList.length - 1].id;
      const dId = dList.find((d: DepartmentInfo) => d.branchId === bId)?.id || '';
      setNewTeam((prev) => ({ ...prev, branchId: bId, departmentId: dId }));
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/organization/production-teams', newTeam);
      setNewTeam((prev) => ({ ...prev, code: '', name: '', leaderName: '' }));
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo Tổ/Chuyền');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Cấu trúc Tổ chức Đa Chi Nhánh (HQ Hub — Nhà Xưởng Spoke — Tổ/Chuyền)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Mô hình mạng nội bộ VLAN 10/20/30/40, ổ đĩa NAS SMB (Access-Based Enumeration) và phân nhóm Tổ/Chuyền sản xuất
        </p>
      </div>

      {/* 1. Chi nhánh */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-600" />
          1. Danh sách Chi nhánh (Branches)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {b.code} ({b.type})
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {b._count?.employees || 0} Nhân sự
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{b.name}</p>
              <div className="text-xs font-mono text-slate-600 space-y-0.5">
                <p>LAN Subnet: {b.subnetCidr || 'N/A'}</p>
                <p>VLAN 30 (Văn phòng): {b.officeVlanCidr || 'N/A'}</p>
                <p>VLAN 40 (Camera & Máy chấm công cô lập): {b.iotVlanCidr || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Phòng ban & NAS Share */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FolderLock className="w-4 h-4 text-purple-600" />
          2. Phòng ban & Phân quyền Thư mục NAS Enterprise (ABE)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {departments.map((d) => (
            <div
              key={d.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {d.code}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {d.branch?.code}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">{d.name}</p>
              <p className="text-[11px] font-mono text-purple-700 truncate">
                {d.nasSharePath || 'Chưa gắn NAS'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Tổ / Chuyền sản xuất */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Users2 className="w-4 h-4 text-amber-600" />
          3. Tổ / Chuyền Sản Xuất tại Nhà Xưởng (Dùng để lọc công nhân & In phiếu lương K80/A4)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teams.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {t.code}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {t._count?.employees || 0} công nhân
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">
                Tổ trưởng: {t.leaderName || 'Chưa gán'} • {t.branch?.code}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleAddTeam}
          className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs"
        >
          <select
            value={newTeam.branchId}
            onChange={(e) => {
              const bId = e.target.value;
              const dId = departments.find((d) => d.branchId === bId)?.id || '';
              setNewTeam({ ...newTeam, branchId: bId, departmentId: dId });
            }}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>

          <input
            required
            placeholder="Mã Tổ/Chuyền (VD: CHUYEN-MAY-02)"
            value={newTeam.code}
            onChange={(e) => setNewTeam({ ...newTeam, code: e.target.value })}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
          />

          <input
            required
            placeholder="Tên Tổ/Chuyền (VD: Chuyền May 02)"
            value={newTeam.name}
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
          />

          <input
            placeholder="Tên Tổ trưởng"
            value={newTeam.leaderName}
            onChange={(e) => setNewTeam({ ...newTeam, leaderName: e.target.value })}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
          />

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center justify-center gap-1 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm Tổ/Chuyền
          </button>
        </form>
      </div>
    </div>
  );
};
