import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, Clock } from 'lucide-react';
import { apiClient } from '../api/axiosClient';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/users/audit-logs?limit=50')
      .then((res) => setLogs(res.data.data || []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History className="w-6 h-6 text-purple-600" />
          Nhật ký Thao tác & Truy vết Bảo mật Toàn Hệ thống (Audit Logs)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghi nhận tự động mọi thao tác đăng nhập 2FA, phân quyền RBAC, khóa công, tính lương và duyệt đơn thu mua
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Phân hệ & Hành động</th>
                <th className="py-3.5 px-4">Tài khoản thực hiện</th>
                <th className="py-3.5 px-4">Chi nhánh</th>
                <th className="py-3.5 px-4">Địa chỉ IP</th>
                <th className="py-3.5 px-4">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Đang tải nhật ký thao tác...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chưa có nhật ký thao tác
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 mr-2">
                        {log.module}
                      </span>
                      <span className="font-bold text-slate-900">{log.action}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {log.user?.username || 'System / Webhook'}
                      </span>
                      {log.user?.role && (
                        <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {log.user.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold text-blue-700">
                        {log.branch?.code || 'ALL'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.ipAddress || 'LAN'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {JSON.stringify(log.newValues || log.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
