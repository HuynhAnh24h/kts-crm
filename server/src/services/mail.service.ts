import { env } from '../config/env';
import { isMailConfigured, mailTransporter } from '../config/mail';

export class MailService {
  /**
   * Gửi mã xác thực 2FA (6 chữ số) qua Google Mail (SMTP)
   */
  static async send2FAOTP(params: {
    toEmail: string;
    username: string;
    otpCode: string;
    ipAddress?: string;
    branchName?: string;
  }): Promise<{ delivered: boolean; devPreviewOtp?: string }> {
    const { toEmail, username, otpCode, ipAddress, branchName } = params;

    const subject = `[${env.APP_NAME}] Mã xác thực đăng nhập 2 lớp (2FA): ${otpCode}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px 24px;">
          <h2 style="margin: 0; font-size: 18px;">🔐 Xác Thực Bảo Mật 2 Lớp (Google Mail 2FA)</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">${env.APP_NAME} — Hệ Thống Quản Trị Đa Chi Nhánh</p>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p>Xin chào <strong>${username}</strong>${branchName ? ` (${branchName})` : ''},</p>
          <p>Hệ thống vừa nhận được yêu cầu đăng nhập vào tài khoản CRM Nội Bộ của bạn. Vui lòng sử dụng mã OTP gồm 6 chữ số dưới đây để hoàn tất bước xác thực 2FA:</p>
          <div style="margin: 24px 0; text-align: center;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; background: #eff6ff; border: 1px dashed #93c5fd; padding: 14px 28px; border-radius: 8px;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            • Mã OTP có hiệu lực trong vòng <strong>${env.OTP_EXPIRES_MINUTES} phút</strong>.<br/>
            • Địa chỉ IP yêu cầu: <code>${ipAddress || 'Nội bộ LAN'}</code><br/>
            • Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
          </p>
        </div>
      </div>
    `;

    if (!isMailConfigured()) {
      console.log(
        `\n📧 [DEV MODE - GOOGLE MAIL 2FA SIMULATOR] --------------------------------\n` +
          `   To: ${toEmail} (${username})\n` +
          `   OTP Code: ${otpCode} (Expires in ${env.OTP_EXPIRES_MINUTES} mins)\n` +
          `-------------------------------------------------------------------------\n`
      );
      return {
        delivered: false,
        ...(env.NODE_ENV === 'development' ? { devPreviewOtp: otpCode } : {}),
      };
    }

    await mailTransporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject,
      html,
    });

    return { delivered: true };
  }
}
