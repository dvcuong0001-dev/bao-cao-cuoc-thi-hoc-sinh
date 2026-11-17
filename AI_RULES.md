# Quy tắc phát triển (dành cho người và AI sửa code)

1. **Cấu trúc**: route mỏng trong `src/app/api/**`; logic dùng chung ở `src/lib/`; giao diện theo tính năng ở `src/features/<tính năng>/`; kiểu dữ liệu chung ở `src/types/`.
2. **Phân quyền luôn kiểm tra ở server**: dùng `requireTeacher`, `requireStudent` (`src/lib/auth.ts`) và `requireClassAccess` (`src/lib/permissions.ts`). Không dựa vào việc ẩn nút trên giao diện.
3. **Không tin dữ liệu từ trình duyệt**: kiểm tra body bằng zod (`src/lib/validations.ts`), lớp của học sinh lấy từ DB, tên file ảnh do server đặt, loại ảnh xác định qua byte đầu file.
4. **Ảnh** chỉ đi qua `src/lib/storage.ts` (R2 hoặc thư mục cục bộ khi phát triển). Không lưu ảnh/base64 vào database.
5. **Báo cáo** đếm bằng SQL (`groupBy`, `count`), không tải toàn bộ bài nộp về rồi tính.
6. **Thêm cột mới** phải có giá trị mặc định để không hỏng dữ liệu cũ. Khi chuyển lớp học sinh phải ghi `ClassMembership`.
7. Mỗi file nên dưới ~250 dòng; tách component khi dài hơn.
8. Ghi thay đổi vào `CHANGELOG.md`.
9. Trước khi xong việc: `npm run typecheck` và `npm run build` phải chạy qua.
