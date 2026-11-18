import React, { useEffect, useState } from 'react';
import {
  KanbanSquare,
  Plus,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppSelector } from '../store';
import { BranchInfo, DepartmentInfo, EmployeeProfile } from '../types/crm';
import { getInitials, TASK_PRIORITY_META } from '../utils/formatters';

const COLUMNS = [
  {
    key: 'TODO',
    title: 'Cần thực hiện',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    headerBorder: 'border-t-slate-500',
  },
  {
    key: 'IN_PROGRESS',
    title: 'Đang triển khai',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBorder: 'border-t-blue-600',
  },
  {
    key: 'REVIEW',
    title: 'Chờ kiểm tra / Duyệt',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBorder: 'border-t-amber-500',
  },
  {
    key: 'COMPLETED',
    title: 'Đã hoàn thành',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBorder: 'border-t-emerald-600',
  },
] as const;

export const TasksKanbanPage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [tasks, setTasks] = useState<any[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    branchId: '',
    departmentId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    dueDate: '2026-11-30',
    assigneeId: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, bRes, dRes, eRes] = await Promise.all([
        apiClient.get('/erp/tasks', {
          params: { branchId: branchFilter || undefined },
        }),
        apiClient.get('/organization/branches').catch(() => ({ data: { data: [] } })),
        apiClient.get('/organization/departments').catch(() => ({ data: { data: [] } })),
        apiClient.get('/employees?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setTasks(tRes.data.data || []);
      const bList = bRes.data.data || [];
      const dList = dRes.data.data || [];
      const eList = eRes.data.data || [];
      setBranches(bList);
      setDepartments(dList);
      setEmployees(eList);

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
  }, [branchFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/erp/tasks', form);
      setShowCreateModal(false);
      setForm((prev) => ({ ...prev, title: '', description: '' }));
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo công việc');
    }
  };

  const handleMoveStatus = async (taskId: string, nextStatus: string) => {
    try {
      await apiClient.patch(`/erp/tasks/${taskId}`, { status: nextStatus });
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi chuyển trạng thái');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-blue-600" />
            Quản lý Công việc Nhân viên Văn phòng (Kanban Board)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giao việc, phân loại mức độ ưu tiên và theo dõi tiến độ xử lý liên phòng ban
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
          >
            <option value="">-- Tất cả Chi nhánh --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Giao Công việc mới
          </button>
        </div>
      </div>

      {/* 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`bg-slate-100/80 border border-slate-200/90 border-t-4 ${col.headerBorder} rounded-2xl p-3.5 space-y-3 min-h-[520px]`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  {col.title}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.badgeClass}`}
                >
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-8">Đang tải...</p>
                ) : colTasks.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    Trống
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const prio =
                      TASK_PRIORITY_META[task.priority] || TASK_PRIORITY_META.MEDIUM;
                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {task.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${prio.className}`}
                          >
                            {prio.label}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span className="font-semibold text-blue-700">
                            {task.department?.name}
                          </span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                {getInitials(task.assignee.fullName)}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[110px]">
                                {task.assignee.fullName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Chưa gán người nhận
                            </span>
                          )}

                          {/* Quick Move Buttons */}
                          <div className="flex items-center gap-1">
                            {col.key === 'TODO' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-0.5"
                              >
                                Nhận việc <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {col.key === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'REVIEW')}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-0.5"
                              >
                                Trình duyệt <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            {col.key === 'REVIEW' && (
                              <button
                                onClick={() => handleMoveStatus(task.id, 'COMPLETED')}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-0.5"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Hoàn tất
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Giao việc mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Giao Công việc Văn phòng mới
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu đề công việc
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Đối chiếu công nợ nhà cung cấp vải quý 4/2026"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Nội dung yêu cầu, tài liệu đính kèm trên NAS..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng ban</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    {departments
                      .filter((d) => !form.branchId || d.branchId === form.branchId)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} — {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhân sự phụ trách
                  </label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    <option value="">-- Chọn nhân sự --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Độ ưu tiên</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  >
                    <option value="URGENT">Khẩn cấp</option>
                    <option value="HIGH">Ưu tiên cao</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="LOW">Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn hoàn thành</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
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
                  Giao Việc Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
