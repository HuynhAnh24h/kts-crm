# KTS Internal Multi-Branch CRM/ERP System

Hệ thống Quản trị Nội bộ Đa Chi Nhánh (Hub & Spoke) được chia thành 2 phân hệ rõ ràng: **`server/` (Backend API MVC + Services Layer)** và **`frontend/` (React + TypeScript + Redux Toolkit + Tailwind CSS)**, bám sát kiến trúc `https://tai-lieu-network.vercel.app/`.

---

## 1. Cấu trúc Dự án (`server/` & `frontend/`)

```text
kts-crm/
├── docker-compose.yml              # PostgreSQL 16 (5433:5432)
├── package.json                    # Scripts điều phối nhanh ở thư mục gốc
├── server/                         # BACKEND API (Node.js + TypeScript + Express + Prisma)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # 9 Bảng cốt lõi Đa Chi Nhánh + Công việc/KHSX/Thu mua
│   │   └── seed.ts                 # Seed dữ liệu mẫu HQ Hub, Xưởng Spoke, Tổ/Chuyền, Tài khoản
│   └── src/
│       ├── config/                 # Env, Database, Nodemailer Gmail 2FA, Ma trận RBAC
│       ├── models/                 # [M]odel Layer: DTO Projections, Cô lập Chi nhánh, Masking
│       ├── services/               # [S]ervices Layer: Nghiệp vụ Auth, 2FA, Users, Employees, External Sync
│       ├── controllers/            # [C]ontroller Layer: Điều phối HTTP Request/Response
│       ├── middlewares/            # Auth JWT, RBAC Branch Scope, External HMAC-SHA256, Zod Validator
│       ├── validators/             # Kiểm tra dữ liệu đầu vào bằng Zod
│       └── routes/                 # Định tuyến API (/api/v1/*)
└── frontend/                       # FRONTEND WEB APP (React 18 + TypeScript + Redux Toolkit + Vite)
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── api/                    # Axios Client + Auto Refresh Token Rotation
        ├── store/                  # Redux Toolkit Store (authSlice)
        ├── components/             # AppLayout, Sidebar phân quyền động theo Permission
        └── pages/                  # Login + 2FA OTP, Dashboard, Users RBAC, Employees, Organization, Payslips K80/A4
```

---

## 2. Hướng dẫn Khởi chạy

### Bước 1: Khởi chạy Database & Seed dữ liệu
```powershell
docker compose up -d
cd server
npm install
npm run prisma:push
npm run prisma:seed
```

### Bước 2: Chạy Backend (`server` - Port 4000)
```powershell
cd server
npm run dev
```

### Bước 3: Chạy Frontend (`frontend` - Port 3000)
```powershell
cd frontend
npm install
npm run dev
```
*(Tất cả tài khoản mẫu trong `seed.ts` như `admin@kts.local`, `director@kts.local`, `hr.hq@kts.local`, `hr.xuong1@kts.local`, `ketoan.xuong1@kts.local` đều có mật khẩu mặc định là `Kts@2026`).*
