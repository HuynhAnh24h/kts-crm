# KTS Internal Multi-Branch CRM/ERP Backend API

Hệ thống Backend API chuẩn **MVC + Services Layer** (Node.js + TypeScript + Express + Prisma PostgreSQL), được thiết kế bám sát **Sơ đồ Kiến trúc Hệ thống Đa Chi Nhánh (Hub & Spoke)**: `https://tai-lieu-network.vercel.app/`.

---

## 1. Kiến trúc thư mục (MVC + Services Layer)

```text
kts-crm/
├── docker-compose.yml              # PostgreSQL 16 (Cổng 5432 nội bộ Docker)
├── prisma/
│   ├── schema.prisma               # 9 Bảng cốt lõi Đa Chi Nhánh + Các phân hệ Văn phòng/Sản xuất/Thu mua
│   └── seed.ts                     # Dữ liệu mẫu: HQ Hub, Xưởng Spoke, Phòng ban, Tổ/Chuyền, Tài khoản mẫu
└── src/
    ├── config/
    │   ├── env.ts                  # Kiểm tra biến môi trường bằng Zod
    │   ├── database.ts             # Prisma Client Singleton
    │   ├── mail.ts                 # Cấu hình Nodemailer Google Mail (SMTP) cho 2FA
    │   └── permissions.ts          # Ma trận Phân quyền RBAC, DataScope & Nhóm thư mục NAS (ABE)
    ├── models/                     # [M]odel Layer: DTO Projections, Bộ lọc cô lập Chi nhánh, Masking dữ liệu nhạy cảm
    │   ├── user.model.ts
    │   ├── employee.model.ts
    │   └── organization.model.ts
    ├── services/                   # [S]ervices Layer: Xử lý nghiệp vụ cốt lõi
    │   ├── auth.service.ts         # Login, Google Mail 2FA OTP, JWT Access/Refresh Rotation
    │   ├── mail.service.ts         # Gửi mã OTP 6 chữ số qua Google Mail
    │   ├── user.service.ts         # Quản trị User, gán Role, gán Scope Chi nhánh, Khóa/Mở khóa
    │   ├── employee.service.ts     # Quản trị Profile Nhân viên, Hợp đồng PDF lưu NAS
    │   ├── organization.service.ts # Quản trị Chi nhánh (HQ/Xưởng), Phòng ban, Tổ/Chuyền
    │   ├── externalSync.service.ts # Webhook Chấm công Cloud, Đồng bộ Lương 2 chiều, In phiếu lương K80/A4
    │   └── audit.service.ts        # Nhật ký thao tác (Audit Logs) toàn hệ thống
    ├── controllers/                # [C]ontroller Layer: Điều phối HTTP Request/Response
    ├── middlewares/                # Auth JWT, RBAC + Branch Isolation, External HMAC-SHA256, Zod Validator
    ├── validators/                 # Schema kiểm tra dữ liệu đầu vào
    └── routes/                     # Định tuyến API (/api/v1/*)
```

---

## 2. Cơ chế Phân quyền Đa Chi Nhánh & Bảo mật

### 2.1. Bảo mật Đăng nhập: JWT + 2FA qua Google Mail
1. **`POST /api/v1/auth/login`**: Kiểm tra `username/email` + `password` (chống brute-force tự khóa tạm thời sau 5 lần sai).
2. Nếu tài khoản bật 2FA (mặc định bật cho các cấp Quản trị, Giám đốc, Kế toán, Nhân sự):
   - Hệ thống sinh mã **OTP 6 chữ số**, lưu bản băm `SHA-256` kèm thời hạn 5 phút và gửi trực tiếp tới **Google Mail** của nhân viên.
   - Trả về `tempToken` (hiệu lực 5 phút).
3. **`POST /api/v1/auth/verify-2fa`**: Gửi `tempToken` + `otpCode` (6 số) để nhận cặp `accessToken` + `refreshToken` cùng toàn bộ danh sách `effectivePermissions`.
   *(Lưu ý: Ở môi trường `development` khi chưa điền Gmail App Password vào `.env`, mã OTP sẽ được in ra Terminal và trả kèm `devPreviewOtp` để dễ dàng test).*

### 2.2. Cô lập Dữ liệu Đa Chi Nhánh (`DataScope`)
Bám sát sơ đồ mạng nội bộ `https://tai-lieu-network.vercel.app/`:
- **`ALL_BRANCHES`**: Dành cho `SUPER_ADMIN`, `DIRECTOR` (Giám đốc), `IT_ADMIN`, `HR_MANAGER` (Nhân sự HQ), `ACCOUNTANT_HQ` (Kế toán HQ) — xem và quản trị xuyên suốt Trụ sở chính (HQ) và mọi Nhà xưởng.
- **`OWN_BRANCH`**: Dành cho `HR_BRANCH` (Nhân sự Xưởng), `ACCOUNTANT_BRANCH` (Kế toán Xưởng), `PRODUCTION_MANAGER` (Kế hoạch SX), `PURCHASING_STAFF` (Thu mua), `SALES_STAFF` (Kinh doanh) — **tự động giới hạn dữ liệu trong phạm vi Chi nhánh / Nhà xưởng của mình**, không thể xem hoặc sửa nhân sự của chi nhánh khác.
- **`OWN_DEPARTMENT` / `OWN_TEAM`**: Giới hạn trong Phòng ban hoặc Tổ / Chuyền sản xuất.
- **`SELF`**: Dành cho `OFFICE_STAFF` / `FACTORY_WORKER` — chỉ xem hồ sơ, bảng công và phiếu lương của chính mình.

---

## 3. Hướng dẫn Khởi chạy

```bash
# 1. Khởi chạy PostgreSQL bằng Docker (hoặc trỏ DATABASE_URL vào PostgreSQL sẵn có)
docker compose up -d

# 2. Đồng bộ Schema vào PostgreSQL
npm run prisma:push

# 3. Nạp dữ liệu mẫu (Chi nhánh HQ & Xưởng, Phòng ban, Tổ/Chuyền, Tài khoản mẫu)
npm run prisma:seed

# 4. Chạy server ở chế độ Development (Port 4000)
npm run dev
```
*(Mật khẩu mặc định của các tài khoản seed mẫu: `Kts@2026`)*
