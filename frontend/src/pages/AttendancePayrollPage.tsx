import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Calculator,
  Lock,
  Unlock,
  PlusCircle,
  Edit3,
  CheckCircle2,
  Printer,
  Search,
  X,
  Banknote,
  Clock,
  ShieldAlert,
  RefreshCw,
  Upload,
  Download,
  CalendarDays,
  Fingerprint,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import {
  BranchInfo,
  DepartmentInfo,
  ProductionTeamInfo,
} from '../types/crm';

export const AttendancePayrollPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'PAYROLL'>('ATTENDANCE');
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [teams, setTeams] = useState<ProductionTeamInfo[]>([]);

  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [productionTeamId, setProductionTeamId] = useState('');
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [search, setSearch] = useState('');

  // Dữ liệu Bảng công
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({
    totalEmployees: 0,
    lockedCount: 0,
    unlockedCount: 0,
    totalOvertimeHours: 0,
  });

  // Dữ liệu Bảng lương
  const [payrollList, setPayrollList] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalOvertimePay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    approvedCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [syncingDevice, setSyncingDevice] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal xem Bảng chi tiết Giờ Vào/Ra từng ngày (1 -> 30/31)
  const [dailyLogsModalAtt, setDailyLogsModalAtt] = useState<any | null>(null);

  // Modal chỉnh sửa chấm công
  const [editingAtt, setEditingAtt] = useState<any | null>(null);
  const [attForm, setAttForm] = useState({
    standardWorkDays: 26,
    actualWorkDays: 26,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    overtimeHoursNormal: 0,
    overtimeHoursWeekend: 0,
    overtimeHoursHoliday: 0,
    lateMinutes: 0,
  });

  // Modal điều chỉnh Thưởng / Tạm ứng trên bảng lương
  const [editingPayroll, setEditingPayroll] = useState<any | null>(null);
  const [payrollAdjForm, setPayrollAdjForm] = useState({
    bonus: 0,
    advanceDeduction: 0,
    taxDeduction: 0,
    otherDeduction: 0,
  });

  const hasPerm = (perm: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.effectivePermissions?.includes(perm);
  };

  useEffect(() => {
    const loadOrg = async () => {
      const [bRes, dRes, tRes] = await Promise.all([
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/production-teams').catch(() => ({ data: { data: [] } })),
      ]);
      const bList = bRes.data.data || [];
      setBranches(bList);
      setDepartments(dRes.data.data || []);
      setTeams(tRes.data.data || []);
      if (bList.length > 0 && !branchId) {
        setBranchId(user?.branch?.id || bList[0].id);
      }
    };
    loadOrg();
  }, []);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      const params = {
        branchId: branchId || undefined,
        departmentId: departmentId || undefined,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
        search: search || undefined,
      };

      if (activeTab === 'ATTENDANCE') {
        const res = await apiClient.get('/attendance-payroll/attendance', { params });
        setAttendanceList(res.data.data.items || []);
        setAttendanceStats(
          res.data.data.summaryStats || {
            totalEmployees: 0,
            lockedCount: 0,
            unlockedCount: 0,
            totalOvertimeHours: 0,
          }
        );
      } else {
        const res = await apiClient.get('/attendance-payroll/payrolls', { params });
        setPayrollList(res.data.data.items || []);
        setFinancialSummary(
          res.data.data.financialSummary || {
            totalEmployees: 0,
            totalGrossSalary: 0,
            totalOvertimePay: 0,
            totalDeductions: 0,
            totalNetPay: 0,
            approvedCount: 0,
          }
        );
      }
    } catch (err: any) {
      setFeedback(err.response?.data?.message || 'Lỗi tải dữ liệu công/lương');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [activeTab, branchId, departmentId, productionTeamId, month, year]);

  // 1A. Kéo công thực tế từ Máy chấm công FaceID / Vân tay (VLAN 40) hoặc Cloud
  const handlePullFromAttendanceDevices = async () => {
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn Chi nhánh cần kéo dữ liệu máy chấm công');
      return;
    }
    setSyncingDevice(true);
    try {
      const res = await apiClient.post('/attendance-payroll/attendance/pull-device-logs', {
        branchId: targetBranch,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
      });
      setFeedback(`✅ ${res.data.message}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể kéo công từ thiết bị');
    } finally {
      setSyncingDevice(false);
    }
  };

  // 1B. Tải file CSV mẫu chấm công của Chi nhánh hiện tại
  const handleDownloadCsvTemplate = () => {
    const header =
      'MaNhanVien,HoTen,CongChuan,CongThucTe,NghiPhepCoLuong,NghiKhongLuong,TangCa150,TangCa200,TangCa300,DiTrePhut\n';
    const sampleRows =
      attendanceList.length > 0
        ? attendanceList
            .map(
              (a) =>
                `${a.employee?.employeeCode},"${a.employee?.fullName}",${Number(
                  a.standardWorkDays
                )},${Number(a.actualWorkDays)},${Number(a.paidLeaveDays)},${Number(
                  a.unpaidLeaveDays
                )},${Number(a.overtimeHoursNormal)},${Number(
                  a.overtimeHoursWeekend
                )},${Number(a.overtimeHoursHoliday)},${Number(a.lateMinutes)}`
            )
            .join('\n')
        : 'CN-FAC1-0101,"Nguyễn Thị Công Nhân May",26,26,0,0,28,8,0,0\nNV-FAC1-0001,"Hoàng Nhân Sự Xưởng 01",26,25,1,0,0,0,0,10';

    const blob = new Blob(['\uFEFF' + header + sampleRows], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Cham_Cong_Thang_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1C. Nhập file CSV xuất từ máy chấm công / Excel
  const handleImportCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn Chi nhánh trước khi nhập file công');
      return;
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      alert('File CSV không có dữ liệu');
      return;
    }

    const rows = lines.slice(1).map((line) => {
      // Tách CSV có hỗ trợ ngoặc kép
      const cols = line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((c) => c.replace(/^"|"$/g, '').trim());
      return {
        employeeCode: cols[0],
        standardWorkDays: Number(cols[2] || 26),
        actualWorkDays: Number(cols[3] || 26),
        paidLeaveDays: Number(cols[4] || 0),
        unpaidLeaveDays: Number(cols[5] || 0),
        overtimeHoursNormal: Number(cols[6] || 0),
        overtimeHoursWeekend: Number(cols[7] || 0),
        overtimeHoursHoliday: Number(cols[8] || 0),
        lateMinutes: Number(cols[9] || 0),
      };
    });

    try {
      const res = await apiClient.post('/attendance-payroll/attendance/import-rows', {
        branchId: targetBranch,
        month,
        year,
        rows,
      });
      setFeedback(`✅ ${res.data.message}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi nhập file chấm công');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Khởi tạo bảng công tháng
  const handleInitMonth = async () => {
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn Chi nhánh trước khi khởi tạo bảng công');
      return;
    }
    try {
      const res = await apiClient.post('/attendance-payroll/attendance/initialize', {
        branchId: targetBranch,
        month,
        year,
        standardWorkDays: 26,
      });
      setFeedback(`✅ ${res.data.message}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể khởi tạo bảng công');
    }
  };

  // Lưu chỉnh sửa công cá nhân
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtt) return;
    try {
      await apiClient.patch(`/attendance-payroll/attendance/${editingAtt.id}`, attForm);
      setEditingAtt(null);
      setFeedback(`✅ Đã cập nhật bảng công của ${editingAtt.employee?.fullName}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật chấm công');
    }
  };

  // Khóa / Mở khóa công hàng loạt
  const handleBatchLock = async (lock: boolean) => {
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn cụ thể 1 Chi nhánh để Khóa/Mở khóa công');
      return;
    }
    try {
      const res = await apiClient.post('/attendance-payroll/attendance/batch-lock', {
        branchId: targetBranch,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
        lock,
      });
      setFeedback(`✅ ${res.data.message}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khóa/mở khóa công');
    }
  };

  // Chạy tính lương tự động từ Công đã khóa + Hợp đồng
  const handleCalculatePayroll = async () => {
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn Chi nhánh cần tính lương');
      return;
    }
    try {
      const res = await apiClient.post('/attendance-payroll/payrolls/calculate-batch', {
        branchId: targetBranch,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
      });
      setFeedback(`✅ ${res.data.message}`);
      setActiveTab('PAYROLL');
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi tính lương tự động');
    }
  };

  // Lưu điều chỉnh Thưởng / Tạm ứng
  const handleSavePayrollAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayroll) return;
    try {
      await apiClient.patch(
        `/attendance-payroll/payrolls/${editingPayroll.id}/adjustments`,
        payrollAdjForm
      );
      setEditingPayroll(null);
      setFeedback(
        `✅ Đã cập nhật Thưởng / Tạm ứng cho ${editingPayroll.employee?.fullName}`
      );
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể điều chỉnh bảng lương');
    }
  };

  // Phê duyệt / Xác nhận thanh toán bảng lương
  const handleBatchPayrollStatus = async (status: 'APPROVED' | 'PAID') => {
    const targetBranch = branchId || user?.branchId;
    if (!targetBranch) {
      alert('Vui lòng chọn Chi nhánh cần duyệt lương');
      return;
    }
    try {
      const res = await apiClient.post('/attendance-payroll/payrolls/batch-status', {
        branchId: targetBranch,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
        status,
      });
      setFeedback(`✅ ${res.data.message}`);
      fetchTabData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể duyệt bảng lương');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Chuyển Tab Chấm công <-> Tính lương */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            Nhân sự Chấm Công, Kéo Công Thực Tế & Kế Toán Tính Lương
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hỗ trợ 3 cách lấy công thực tế: <strong>1. Kéo từ Máy chấm công FaceID/Vân tay (VLAN 40)</strong> • <strong>2. Nhập file Excel/CSV</strong> • <strong>3. Chỉnh sửa trực tiếp & Khóa công</strong>
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 border border-slate-300">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'ATTENDANCE'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            1. Bảng Chấm Công & Kéo Công (HR)
          </button>
          <button
            onClick={() => setActiveTab('PAYROLL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'PAYROLL'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            2. Bảng Tính Lương & Duyệt Chi (Kế toán)
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bộ lọc Kỳ công/lương & Chi nhánh - Phòng ban - Tổ chuyền */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Kỳ Tháng / Năm</label>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Chi nhánh</label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setDepartmentId('');
              setProductionTeamId('');
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium"
          >
            <option value="">-- Tất cả Chi nhánh --</option>
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
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium"
          >
            <option value="">-- Tất cả Phòng ban --</option>
            {departments
              .filter((d) => !branchId || d.branchId === branchId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Tổ / Chuyền SX</label>
          <select
            value={productionTeamId}
            onChange={(e) => setProductionTeamId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-medium"
          >
            <option value="">-- Tất cả Tổ / Chuyền --</option>
            {teams
              .filter((t) => !branchId || t.branchId === branchId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">Tìm kiếm nhân viên</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTabData()}
              placeholder="Nhập tên hoặc mã nhân viên..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: BẢNG CHẤM CÔNG, KÉO CÔNG THỰC TẾ & KHÓA CÔNG THÁNG
         ===================================================================== */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-5">
          {/* Thống kê nhanh */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-medium">Tổng quân số bảng công</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {attendanceStats.totalEmployees} nhân sự
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-semibold">Đã Khóa Công (Sẵn sàng tính lương)</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                {attendanceStats.lockedCount} / {attendanceStats.totalEmployees}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <p className="text-xs text-amber-800 font-semibold">Chưa Khóa Công (Đang mở sửa)</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {attendanceStats.unlockedCount} nhân sự
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold">Tổng Giờ Tăng Ca Kỳ {month}/{year}</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {attendanceStats.totalOvertimeHours} giờ
              </p>
            </div>
          </div>

          {/* Thanh công cụ Kéo công thực tế & Khóa công */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {hasPerm('attendance:update') && (
                  <>
                    <button
                      onClick={handlePullFromAttendanceDevices}
                      disabled={syncingDevice}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Fingerprint className={`w-4 h-4 ${syncingDevice ? 'animate-spin' : ''}`} />
                      {syncingDevice
                        ? 'Đang kéo log từ Máy chấm công...'
                        : 'Kéo Công Thực Tế Từ Máy Chấm Công (FaceID/Vân Tay)'}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleImportCsvFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      Nhập Công từ File CSV/Excel
                    </button>

                    <button
                      onClick={handleDownloadCsvTemplate}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải File Mẫu (.CSV)
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasPerm('attendance:lock') && (
                  <>
                    <button
                      onClick={() => handleBatchLock(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-4 h-4" />
                      Khóa Công Kỳ Này
                    </button>
                    <button
                      onClick={() => handleBatchLock(false)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Unlock className="w-4 h-4" />
                      Mở Khóa
                    </button>
                  </>
                )}

                {hasPerm('payroll:calculate') && (
                  <button
                    onClick={handleCalculatePayroll}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Calculator className="w-4 h-4" />
                    Tính Lương Tự Động →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bảng danh sách chấm công */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="py-3.5 px-4">Nhân viên</th>
                    <th className="py-3.5 px-4">Chi nhánh / Tổ chuyền</th>
                    <th className="py-3.5 px-4 text-center">Công thực tế / Chuẩn</th>
                    <th className="py-3.5 px-4 text-center">Phép / K.Lương / Trễ</th>
                    <th className="py-3.5 px-4 text-center">Tăng ca (150% / 200% / 300%)</th>
                    <th className="py-3.5 px-4 text-center">Nguồn đồng bộ & Khóa</th>
                    <th className="py-3.5 px-4 text-right">Chi tiết Vào/Ra & Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Đang tải bảng chấm công...
                      </td>
                    </tr>
                  ) : attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 space-y-2">
                        <p>Chưa có dữ liệu bảng công cho Tháng {month}/{year}.</p>
                        {hasPerm('attendance:update') && (
                          <button
                            onClick={handlePullFromAttendanceDevices}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                          >
                            <Fingerprint className="w-4 h-4" />
                            Bấm để Kéo công thực tế từ Máy chấm công Tháng {month}/{year}
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((att) => {
                      const hasDailyLogs = Array.isArray(att.rawCloudPayload?.dailyLogs);
                      return (
                        <tr key={att.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {att.employee?.employeeCode}
                            </span>
                            <p className="font-bold text-slate-900 mt-1">
                              {att.employee?.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {att.employee?.positionTitle}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-blue-700">{att.branch?.code}</p>
                            <p className="text-[11px] text-slate-600">
                              {att.employee?.department?.name}
                            </p>
                            {att.employee?.productionTeam && (
                              <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                {att.employee.productionTeam.name}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="text-sm font-extrabold text-slate-900">
                              {Number(att.actualWorkDays)}
                            </span>
                            <span className="text-slate-400">
                              {' '}
                              / {Number(att.standardWorkDays)} ngày
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="text-emerald-700 font-semibold">
                              {Number(att.paidLeaveDays)}P
                            </span>
                            {' • '}
                            <span className="text-rose-600 font-semibold">
                              {Number(att.unpaidLeaveDays)}KL
                            </span>
                            {Number(att.lateMinutes) > 0 && (
                              <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                Trễ: {att.lateMinutes} phút
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                              {Number(att.overtimeHoursNormal)}h
                            </span>{' '}
                            /{' '}
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              {Number(att.overtimeHoursWeekend)}h
                            </span>{' '}
                            /{' '}
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                              {Number(att.overtimeHoursHoliday)}h
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center space-y-1">
                            <div>
                              {att.isLocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                                  <Lock className="w-3 h-3" /> ĐÃ KHÓA CÔNG
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                                  <Unlock className="w-3 h-3" /> ĐANG MỞ
                                </span>
                              )}
                            </div>
                            {att.syncedFromCloudAt && (
                              <p className="text-[10px] text-slate-400 font-mono">
                                Đồng bộ:{' '}
                                {new Date(att.syncedFromCloudAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {hasDailyLogs && (
                              <button
                                onClick={() => setDailyLogsModalAtt(att)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold inline-flex items-center gap-1"
                              >
                                <CalendarDays className="w-3.5 h-3.5" /> Log Vào/Ra
                              </button>
                            )}

                            {hasPerm('attendance:update') && !att.isLocked && (
                              <button
                                onClick={() => {
                                  setEditingAtt(att);
                                  setAttForm({
                                    standardWorkDays: Number(att.standardWorkDays),
                                    actualWorkDays: Number(att.actualWorkDays),
                                    paidLeaveDays: Number(att.paidLeaveDays),
                                    unpaidLeaveDays: Number(att.unpaidLeaveDays),
                                    overtimeHoursNormal: Number(att.overtimeHoursNormal),
                                    overtimeHoursWeekend: Number(att.overtimeHoursWeekend),
                                    overtimeHoursHoliday: Number(att.overtimeHoursHoliday),
                                    lateMinutes: Number(att.lateMinutes),
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Sửa
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
        </div>
      )}

      {/* =====================================================================
          TAB 2: BẢNG TÍNH LƯƠNG & PHÊ DUYỆT LƯƠNG (KẾ TOÁN & GIÁM ĐỐC)
         ===================================================================== */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-5">
          {/* Thẻ Tổng hợp Quỹ lương */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold">Tổng Quỹ Lương Gross</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {financialSummary.totalGrossSalary.toLocaleString('vi-VN')} đ
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {financialSummary.totalEmployees} phiếu lương
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <p className="text-xs text-amber-800 font-semibold">Tổng Tiền Tăng Ca (OT Pay)</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {financialSummary.totalOvertimePay.toLocaleString('vi-VN')} đ
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Tính theo hệ số 150% / 200% / 300%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
              <p className="text-xs text-rose-700 font-semibold">
                Tổng Khấu Trừ (BHXH 10.5% + Thuế + Ứng)
              </p>
              <p className="text-xl font-bold text-rose-800 mt-1">
                {financialSummary.totalDeductions.toLocaleString('vi-VN')} đ
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-800 font-bold">
                TỔNG THỰC LÃNH (NET PAY)
              </p>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {financialSummary.totalNetPay.toLocaleString('vi-VN')} VNĐ
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Đã duyệt: {financialSummary.approvedCount}/{financialSummary.totalEmployees}
              </p>
            </div>
          </div>

          {/* Thanh công cụ Kế toán & Giám đốc */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {hasPerm('payroll:calculate') && (
                <button
                  onClick={handleCalculatePayroll}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Calculator className="w-4 h-4" />
                  Chạy Tính Lương Tự Động (Từ Công Đã Khóa)
                </button>
              )}

              {hasPerm('payroll:approve') && (
                <>
                  <button
                    onClick={() => handleBatchPayrollStatus('APPROVED')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Phê Duyệt Bảng Lương (APPROVED)
                  </button>
                  <button
                    onClick={() => handleBatchPayrollStatus('PAID')}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Banknote className="w-4 h-4" />
                    Xác Nhận Đã Chi Lương (PAID)
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => navigate('/payslips')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              In Phiếu Lương K80/A4 Theo Tổ Chuyền →
            </button>
          </div>

          {/* Bảng lương chi tiết */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="py-3.5 px-4">Nhân viên & Tổ/Chuyền</th>
                    <th className="py-3.5 px-4 text-right">Lương HĐ & Ngày công</th>
                    <th className="py-3.5 px-4 text-right">Tăng ca (Giờ / Tiền)</th>
                    <th className="py-3.5 px-4 text-right">Phụ cấp & Thưởng</th>
                    <th className="py-3.5 px-4 text-right">Khấu trừ (BHXH/Thuế/Ứng)</th>
                    <th className="py-3.5 px-4 text-right">Thực lãnh (Net Pay)</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Điều chỉnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        Đang tải dữ liệu bảng lương...
                      </td>
                    </tr>
                  ) : payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500 space-y-2">
                        <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
                        <p>
                          Chưa có bảng lương được tính cho kỳ Tháng {month}/{year}. Hãy khóa công ở Tab 1 và bấm <strong>"Chạy Tính Lương Tự Động"</strong>.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    payrollList.map((p) => {
                      const totalDed =
                        Number(p.insuranceDeduction) +
                        Number(p.taxDeduction) +
                        Number(p.advanceDeduction) +
                        Number(p.otherDeduction);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {p.employee?.employeeCode}
                            </span>
                            <p className="font-bold text-slate-900 mt-1">
                              {p.employee?.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {p.productionTeam?.name || p.employee?.department?.name}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <p className="font-bold text-slate-900">
                              {Number(p.workDaySalary).toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[11px] text-slate-500">
                              HĐ: {Number(p.baseSalary).toLocaleString('vi-VN')} đ
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <p className="font-bold text-amber-800">
                              +{Number(p.overtimePay).toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[11px] text-amber-700 font-semibold">
                              {Number(p.totalOvertimeHours)} giờ OT
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <p className="text-slate-800 font-semibold">
                              PC: +{Number(p.totalAllowances).toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-emerald-700 font-semibold">
                              Thưởng: +{Number(p.bonus).toLocaleString('vi-VN')} đ
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-rose-700">
                            <p className="font-semibold">
                              -{totalDed.toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[10px] text-slate-500">
                              BHXH: {Number(p.insuranceDeduction).toLocaleString('vi-VN')} | Ứng:{' '}
                              {Number(p.advanceDeduction).toLocaleString('vi-VN')}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono">
                            <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {Number(p.netPay).toLocaleString('vi-VN')} đ
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                p.status === 'PAID'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : p.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {hasPerm('payroll:calculate') && p.status !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setEditingPayroll(p);
                                  setPayrollAdjForm({
                                    bonus: Number(p.bonus),
                                    advanceDeduction: Number(p.advanceDeduction),
                                    taxDeduction: Number(p.taxDeduction),
                                    otherDeduction: Number(p.otherDeduction),
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Thưởng/Ứng
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
        </div>
      )}

      {/* Modal Xem Bảng Log Giờ Vào / Ra Từng Ngày Trong Tháng (1 -> 30/31) */}
      {dailyLogsModalAtt && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end"
          onClick={() => setDailyLogsModalAtt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 p-6 overflow-y-auto space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {dailyLogsModalAtt.employee?.employeeCode}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {dailyLogsModalAtt.rawCloudPayload?.deviceSource || 'Máy chấm công VLAN 40'}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Chi tiết Giờ Vào / Ra Tháng {month}/{year} — {dailyLogsModalAtt.employee?.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  Tổng cộng: <strong>{Number(dailyLogsModalAtt.actualWorkDays)} công thực tế</strong> •{' '}
                  <strong>
                    {Number(dailyLogsModalAtt.overtimeHoursNormal) +
                      Number(dailyLogsModalAtt.overtimeHoursWeekend)}
                    h tăng ca
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setDailyLogsModalAtt(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ngày</th>
                    <th className="py-2.5 px-3">Thứ</th>
                    <th className="py-2.5 px-3 text-center">Giờ Vào (In)</th>
                    <th className="py-2.5 px-3 text-center">Giờ Ra (Out)</th>
                    <th className="py-2.5 px-3 text-center">Công</th>
                    <th className="py-2.5 px-3 text-center">Tăng ca</th>
                    <th className="py-2.5 px-3">Ghi chú máy chấm công</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(dailyLogsModalAtt.rawCloudPayload?.dailyLogs || []).map((log: any) => (
                    <tr
                      key={log.day}
                      className={
                        log.dayOfWeek === 'CN' ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                        {log.date}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-600">{log.dayOfWeek}</td>
                      <td className="py-2 px-3 text-center font-mono">
                        {log.checkIn ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              log.lateMins > 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {log.checkIn}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {log.checkOut ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                            {log.checkOut}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {log.workDayCredit > 0 ? `${log.workDayCredit}.0` : '0'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700">
                        {log.otNormal + log.otWeekend > 0
                          ? `+${log.otNormal + log.otWeekend}h`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{log.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Chấm công & Giờ tăng ca */}
      {editingAtt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cập nhật Ngày công & Tăng ca
                </h3>
                <p className="text-xs text-slate-500">
                  {editingAtt.employee?.employeeCode} — {editingAtt.employee?.fullName}
                </p>
              </div>
              <button onClick={() => setEditingAtt(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày công chuẩn tháng
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.standardWorkDays}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        standardWorkDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày công đi làm thực tế
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.actualWorkDays}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        actualWorkDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nghỉ phép có lương (ngày)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.paidLeaveDays}
                    onChange={(e) =>
                      setAttForm({ ...attForm, paidLeaveDays: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nghỉ không lương (ngày)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.unpaidLeaveDays}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        unpaidLeaveDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block font-semibold text-blue-700 mb-1">
                    OT Thường (150%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.overtimeHoursNormal}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        overtimeHoursNormal: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-blue-50/50 border border-blue-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-700 mb-1">
                    OT CN (200%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.overtimeHoursWeekend}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        overtimeHoursWeekend: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-amber-50/50 border border-amber-300 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-purple-700 mb-1">
                    OT Lễ (300%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={attForm.overtimeHoursHoliday}
                    onChange={(e) =>
                      setAttForm({
                        ...attForm,
                        overtimeHoursHoliday: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg bg-purple-50/50 border border-purple-300 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAtt(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Lưu Bảng Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Điều chỉnh Thưởng / Tạm ứng trên Bảng lương */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Điều chỉnh Thưởng / Tạm ứng / Khấu trừ
                </h3>
                <p className="text-xs text-slate-500">
                  {editingPayroll.employee?.employeeCode} — {editingPayroll.employee?.fullName}
                </p>
              </div>
              <button onClick={() => setEditingPayroll(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayrollAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-emerald-700 mb-1">
                  Tiền Thưởng năng suất / chuyên cần (+ VNĐ)
                </label>
                <input
                  type="number"
                  value={payrollAdjForm.bonus}
                  onChange={(e) =>
                    setPayrollAdjForm({
                      ...payrollAdjForm,
                      bonus: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-300 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-700 mb-1">
                  Trừ Tạm ứng lương (- VNĐ)
                </label>
                <input
                  type="number"
                  value={payrollAdjForm.advanceDeduction}
                  onChange={(e) =>
                    setPayrollAdjForm({
                      ...payrollAdjForm,
                      advanceDeduction: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-rose-50/50 border border-rose-300 text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Thuế TNCN (- VNĐ)
                  </label>
                  <input
                    type="number"
                    value={payrollAdjForm.taxDeduction}
                    onChange={(e) =>
                      setPayrollAdjForm({
                        ...payrollAdjForm,
                        taxDeduction: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khấu trừ khác (- VNĐ)
                  </label>
                  <input
                    type="number"
                    value={payrollAdjForm.otherDeduction}
                    onChange={(e) =>
                      setPayrollAdjForm({
                        ...payrollAdjForm,
                        otherDeduction: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPayroll(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Cập nhật Phiếu Lương
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
