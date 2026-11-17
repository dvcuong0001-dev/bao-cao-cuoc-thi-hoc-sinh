# Báo cáo cuộc thi học sinh

Ứng dụng web cho khoảng 1000 học sinh nộp ảnh minh chứng tham gia cuộc thi; GVCN và giáo viên được phân quyền theo dõi tiến độ lớp mình.

- **Học sinh**: chọn lớp → chọn tên → nhập PIN, xem cuộc thi của lớp, nộp ảnh (tự nén trên điện thoại).
- **GVCN / người xem**: mỗi lớp có thể có nhiều người. GVCN xem tiến độ, ảnh, ma trận cả năm, sao chép danh sách chưa nộp, cấp lại PIN và in phiếu PIN. Người xem chỉ xem.
- **Quản trị viên**: tạo cuộc thi giao theo lớp/khối, nhập học sinh từ Excel, quản lý giáo viên, báo cáo toàn trường, xuất Excel, lưu trữ (dọn ảnh), kết chuyển năm học.

Công nghệ: Next.js 14, Prisma + PostgreSQL (Neon), Cloudflare R2 (lưu ảnh), triển khai trên Vercel.

---

## 1. Chạy thử trên máy (không cần Neon, không cần R2)

Khi chưa có R2, ảnh được lưu tạm vào thư mục `.local-uploads/`.

```bash
npm install
```

Mở 1 cửa sổ terminal riêng để chạy database thử (giữ cửa sổ này mở):

```bash
npm run db:local
```

Ở cửa sổ khác, tạo file `.env` từ `.env.example` (giữ nguyên dòng `DATABASE_URL` localhost), rồi:

```bash
npx prisma db push
```

```bash
npm run db:demo
```

```bash
npm run dev
```

Mở http://localhost:3000. Dữ liệu demo: 30 lớp, ~1000 học sinh, mọi tài khoản PIN `123456`, admin tên **Admin Demo**.

Muốn dữ liệu sạch thay vì demo: dừng `db:local`, xoá thư mục `.local-db/`, chạy lại `db:local` + `prisma db push`, rồi `npm run db:seed` để tạo admin đầu tiên.

---

## 2. Đưa lên mạng (Neon + Cloudflare R2 + Vercel)

### 2.1 Neon (database)
1. Tạo project mới trên Neon, chọn region gần Việt Nam (Singapore).
2. Lấy 2 chuỗi kết nối trong mục **Connect**:
   - **Pooled** (host có chữ `-pooler`): dùng trên Vercel, thêm `&pgbouncer=true` vào cuối chuỗi.
   - **Direct** (tắt "Connection pooling"): dùng ở bước 2.5 để tạo bảng từ máy của bạn.

### 2.2 Cloudflare R2 (lưu ảnh)
1. Đăng ký/đăng nhập Cloudflare → **R2 Object Storage** → kích hoạt R2 (Cloudflare có thể yêu cầu thêm thẻ thanh toán, dùng trong mức miễn phí 10GB/tháng thì không mất phí).
2. **Create bucket**, tên ví dụ `bao-cao-hs-anh`, để **private** (KHÔNG bật Public access). Không cần cấu hình CORS vì ảnh đi qua server.
3. **Manage R2 API Tokens → Create API token**: quyền *Object Read & Write*, chỉ áp dụng cho bucket trên.
4. Ghi lại 4 giá trị: `Account ID` (trang tổng quan R2), `Access Key ID`, `Secret Access Key`, tên bucket.
5. Nên bật **Billing notifications** trong Cloudflare để được báo nếu vượt mức miễn phí.

### 2.3 GitHub
Tạo repo mới (private), rồi trong thư mục dự án:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Khoi tao app bao cao cuoc thi hoc sinh"
```

Sau đó làm theo hướng dẫn GitHub để `git remote add origin ...` và `git push -u origin main`. File `.env`, `.local-db/`, `.local-uploads/` đã nằm trong `.gitignore`, không bị đẩy lên.

### 2.4 Vercel
1. **Add New → Project** → chọn repo vừa tạo (Framework: Next.js, giữ mặc định).
2. **Environment Variables**, thêm:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | Chuỗi Neon bản Pooled, có thêm `&pgbouncer=true` |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên ≥ 32 ký tự (tạo bằng lệnh bên dưới) |
| `R2_ACCOUNT_ID` | Account ID của Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key ID của token R2 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key của token R2 |
| `R2_BUCKET` | Tên bucket |

Tạo `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Deploy.

### 2.5 Tạo bảng và admin đầu tiên trên Neon (làm 1 lần, từ máy của bạn)
Tạm đặt `DATABASE_URL` trong `.env` thành chuỗi Neon bản **Direct**, rồi:

```bash
npx prisma db push
```

```bash
npm run db:seed
```

Lệnh seed in ra tên và PIN tạm của Tổng quản trị. Đăng nhập tab **Giáo viên**, đổi PIN, rồi:
1. **Giáo viên** → thêm danh sách giáo viên → in phiếu PIN.
2. **Lớp & học sinh** → nhập học sinh từ Excel (cột: Lớp | Họ tên | Ngày sinh | Mã HS) → in phiếu PIN theo lớp.
3. Bấm biểu tượng phân quyền ở từng lớp để gán GVCN / người xem.
4. **Cuộc thi** → tạo cuộc thi, chọn khối/lớp.

Nhớ đổi `DATABASE_URL` trong `.env` về localhost sau khi làm xong, tránh chạy nhầm dữ liệu demo lên database thật (lệnh `db:demo` tự từ chối nếu không phải localhost).

---

## 3. Ghi chú vận hành
- **PIN**: 6 số, sinh ngẫu nhiên, bắt buộc đổi ở lần đăng nhập đầu. Sai 5 lần khoá 15 phút; GVCN mở khoá hoặc cấp lại PIN trong trang lớp.
- **Ảnh**: nén trên điện thoại còn ~200KB + ảnh thu nhỏ ~20KB; server kiểm tra đúng là ảnh rồi lưu R2 theo đường dẫn `năm-học/cuộc-thi/lớp/học-sinh.jpg`. Nộp lại sẽ ghi đè ảnh cũ. Xem ảnh qua đường dẫn ký có hạn 1 giờ.
- **Dung lượng**: ~1000 học sinh × 20 cuộc thi × ~220KB ≈ 4.5GB/năm. Bấm **Lưu trữ** ở cuộc thi đã hết hạn để xoá ảnh (giữ lịch sử nộp), nên xuất Excel trước.
- **Đầu năm học mới**: tab **Năm học** → Kết chuyển (6A1 → 7A1, khối cuối cấp ra trường). Báo cáo năm cũ vẫn xem được.

## 4. Lệnh hữu ích
| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy app ở chế độ phát triển |
| `npm run build` | Build như trên Vercel |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run db:local` | Database thử trên máy (PGlite) |
| `npm run db:seed` | Tạo Tổng quản trị đầu tiên |
| `npm run db:demo` | Nạp dữ liệu demo (chỉ localhost) |
