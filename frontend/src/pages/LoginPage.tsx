import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Lock,
  UserCheck,
  KeyRound,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../api/axiosClient';
import { useAppDispatch } from '../store';
import { setSession } from '../store/authSlice';

const DEMO_ACCOUNTS = [
  {
    label: 'Super Admin (IT Remote)',
    identifier: 'admin@kts.local',
    role: 'SUPER_ADMIN',
    scope: 'ALL_BRANCHES (Toàn hệ thống)',
    desc: 'Toàn quyền quản trị User, RBAC, Chi nhánh, Audit Log',
  },
  {
    label: 'Tổng Giám Đốc (HQ Hub)',
    identifier: 'director@kts.local',
    role: 'DIRECTOR',
    scope: 'ALL_BRANCHES (Đa chi nhánh)',
    desc: 'Xem báo cáo, nhân sự, lương, kế hoạch SX mọi chi nhánh',
  },
  {
    label: 'Trưởng Phòng Nhân Sự (HQ)',
    identifier: 'hr.hq@kts.local',
    role: 'HR_MANAGER',
    scope: 'ALL_BRANCHES (Đa chi nhánh)',
    desc: 'Quản trị Profile nhân viên & Hợp đồng PDF toàn công ty',
  },
  {
    label: 'Nhân Sự Nhà Xưởng 01 (Spoke)',
    identifier: 'hr.xuong1@kts.local',
    role: 'HR_BRANCH',
    scope: 'OWN_BRANCH (Chỉ Xưởng 01)',
    desc: 'Chỉ xem & thao tác danh sách nhân sự thuộc Nhà xưởng 01',
  },
  {
    label: 'Kế Toán Nhà Xưởng 01 (Spoke)',
    identifier: 'ketoan.xuong1@kts.local',
    role: 'ACCOUNTANT_BRANCH',
    scope: 'OWN_BRANCH (Chỉ Xưởng 01)',
    desc: 'Xem lương Xưởng 01 & In phiếu lương K80/A4 theo Tổ/Chuyền',
  },
  {
    label: 'Công Nhân Chuyền May 01',
    identifier: 'congnhan01@kts.local',
    role: 'FACTORY_WORKER',
    scope: 'SELF (Chỉ hồ sơ cá nhân)',
    desc: 'Không bắt buộc 2FA, chỉ xem hồ sơ & phiếu lương của chính mình',
  },
];

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('admin@kts.local');
  const [password, setPassword] = useState('Kts@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State cho bước 2: Xác thực 2FA qua Google Mail OTP
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP_2FA'>('CREDENTIALS');
  const [tempToken, setTempToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devPreviewOtp, setDevPreviewOtp] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { identifier, password });
      const data = res.data.data;

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setMaskedEmail(data.maskedEmail);
        if (data.devPreviewOtp) {
          setDevPreviewOtp(data.devPreviewOtp);
          setOtpCode(data.devPreviewOtp);
        } else {
          setDevPreviewOtp(null);
          setOtpCode('');
        }
        setStep('OTP_2FA');
      } else {
        dispatch(
          setSession({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          })
        );
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-2fa', {
        tempToken,
        otpCode,
      });
      const data = res.data.data;
      dispatch(
        setSession({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã OTP không hợp lệ');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    try {
      const res = await apiClient.post('/auth/resend-2fa', { tempToken });
      const data = res.data.data;
      if (data.devPreviewOtp) {
        setDevPreviewOtp(data.devPreviewOtp);
        setOtpCode(data.devPreviewOtp);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Form Đăng nhập & Google Mail 2FA */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-7 shadow-xl shadow-slate-200/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">KTS INTERNAL CRM</h1>
              <p className="text-xs text-slate-500">
                Xác thực JWT + Bảo mật 2 lớp Google Mail
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {step === 'CREDENTIALS' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email hoặc Username (AD/LDAP)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@kts.local hoặc it.admin"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu nội bộ
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition"
              >
                <span>{loading ? 'Đang kiểm tra...' : 'Đăng nhập hệ thống'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                <p className="font-bold">📧 Đã gửi mã OTP 2FA qua Google Mail</p>
                <p className="text-blue-700">
                  Vui lòng kiểm tra hộp thư <strong>{maskedEmail}</strong> và nhập 6 chữ số xác thực.
                </p>
              </div>

              {devPreviewOtp && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <Sparkles className="w-3.5 h-3.5" /> Chế độ Dev (Simulator):
                    </span>
                    <span>Mã OTP vừa sinh là: </span>
                    <strong className="font-mono text-sm tracking-widest text-slate-900">
                      {devPreviewOtp}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devPreviewOtp)}
                    className="px-2.5 py-1 rounded bg-amber-200/70 hover:bg-amber-300/70 text-amber-900 font-semibold"
                  >
                    Điền nhanh
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã OTP 6 chữ số
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-lg font-mono font-bold tracking-[0.5em] text-center text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-semibold text-sm text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition"
              >
                <span>{loading ? 'Đang xác thực...' : 'Xác nhận OTP & Vào CRM'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStep('CREDENTIALS')}
                  className="text-slate-500 hover:text-slate-900"
                >
                  ← Quay lại đổi tài khoản
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Gửi lại mã OTP
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Cột phải: Chọn nhanh Tài khoản Demo theo cấu trúc Đa Chi Nhánh */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                Chọn nhanh Tài khoản Demo Phân quyền Đa Chi Nhánh
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click vào bất kỳ vai trò nào bên dưới để tự động điền thông tin đăng nhập (Mật khẩu chung: <code className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Kts@2026</code>)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = identifier === acc.identifier;
              return (
                <button
                  key={acc.identifier}
                  type="button"
                  onClick={() => {
                    setIdentifier(acc.identifier);
                    setPassword('Kts@2026');
                    setStep('CREDENTIALS');
                    setError(null);
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">
                      {acc.label}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {acc.role}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono font-semibold text-emerald-700 mb-1">
                    {acc.identifier} • {acc.scope}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {acc.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
