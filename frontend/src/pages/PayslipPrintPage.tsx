import React, { useEffect, useState } from 'react';
import { Printer, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { BranchInfo, ProductionTeamInfo } from '../types/crm';

export const PayslipPrintPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [teams, setTeams] = useState<ProductionTeamInfo[]>([]);

  const [branchId, setBranchId] = useState('');
  const [productionTeamId, setProductionTeamId] = useState('');
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [format, setFormat] = useState<'K80_THERMAL' | 'A4_THREE_UP'>('K80_THERMAL');

  const [printResult, setPrintResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      const [bRes, tRes] = await Promise.all([
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/production-teams').catch(() => ({ data: { data: [] } })),
      ]);
      const bList = bRes.data.data || [];
      setBranches(bList);
      setTeams(tRes.data.data || []);
      if (bList.length > 0) {
        setBranchId(bList[bList.length - 1].id);
      }
    };
    loadMeta();
  }, []);

  const handlePrintBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.post('/external/payslips/print-batch', {
        branchId,
        productionTeamId: productionTeamId || undefined,
        month,
        year,
        format,
      });
      setPrintResult(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xuất lệnh in phiếu lương');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Printer className="w-5 h-5 text-amber-400" />
          In Phiếu Lương Hàng Loạt K80 / A4 Theo Tổ Chuyền (Nhà Xưởng)
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Luồng 3 trên sơ đồ mạng: PC Kế toán / HR Xưởng lọc theo Tổ/Chuyền và xuất lệnh in nhiệt K80 tự cắt hoặc A4 (3 phiếu/trang), in đậm Giờ tăng ca & Tiền thực lãnh
        </p>
      </div>

      <form
        onSubmit={handlePrintBatch}
        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end"
      >
        <div>
          <label className="block text-slate-300 mb-1">Chi nhánh / Nhà xưởng</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
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
          <label className="block text-slate-300 mb-1">Tổ / Chuyền Sản Xuất</label>
          <select
            value={productionTeamId}
            onChange={(e) => setProductionTeamId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1">Tháng</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Năm</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Khổ giấy máy in</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
          >
            <option value="K80_THERMAL">Máy in nhiệt K80 (Tự cắt rời)</option>
            <option value="A4_THREE_UP">Khổ A4 (3 phiếu / trang)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          {loading ? 'Đang kết xuất...' : 'Xuất Lệnh In Phiếu Lương'}
        </button>
      </form>

      {printResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5" />
              Đã kết xuất {printResult.printJobMeta.totalSlips} phiếu lương ({printResult.printJobMeta.paperSpec})
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Người in: {printResult.printJobMeta.printedBy}
            </span>
          </div>

          {printResult.slips.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
              <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Chưa có dữ liệu bảng lương đã đồng bộ từ Phần mềm Tính lương Riêng cho kỳ {month}/{year}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {printResult.slips.map((slip: any) => (
                <div
                  key={slip.payrollId}
                  className="p-4 rounded-xl bg-white text-slate-900 font-mono text-xs space-y-2 shadow-xl border-t-4 border-slate-900"
                >
                  <div className="text-center border-b border-dashed border-slate-400 pb-2">
                    <p className="font-bold text-sm">PHIẾU LƯƠNG KTS</p>
                    <p>{slip.branchName}</p>
                    <p className="font-bold">{slip.productionTeamName}</p>
                  </div>
                  <div className="space-y-1">
                    <p>
                      Mã NV: <strong>{slip.employeeCode}</strong> — {slip.fullName}
                    </p>
                    <p>Ngày công: {slip.workDays}</p>
                    <p>Lương HĐ: {slip.baseSalary.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 bg-amber-50 px-2">
                    <p className="font-bold text-sm">
                      GIỜ TĂNG CA: {slip.highlightBold.totalOvertimeHours}h ({slip.highlightBold.overtimePay.toLocaleString('vi-VN')} đ)
                    </p>
                    <p className="font-bold text-base text-emerald-800">
                      THỰC LÃNH: {slip.highlightBold.netPay.toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
