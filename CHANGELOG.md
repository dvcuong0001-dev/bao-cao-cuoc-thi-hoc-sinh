# Changelog

## [0.1.0] - 2026-11-17
### Phiên bản đầu tiên
- Đăng nhập học sinh: chọn lớp → chọn tên → PIN; giáo viên: chọn tên → PIN. Khoá 15 phút sau 5 lần sai (lưu trong DB), bắt buộc đổi PIN lần đầu, chặn PIN dễ đoán.
- Phân quyền lớp: mỗi lớp nhiều người xem, vai trò GVCN (được cấp lại PIN, mở khoá) hoặc Xem.
- Cuộc thi giao theo lớp/khối; hạn chót, nhận/không nhận nộp muộn, kết thúc sớm, lưu trữ (xoá ảnh, giữ lịch sử), xoá.
- Nộp minh chứng: nén ảnh trên điện thoại (1280px ~200KB + ảnh thu nhỏ 320px), kiểm tra chữ ký file ảnh trên server, lưu Cloudflare R2 (bucket private, xem qua đường dẫn ký 1 giờ); không có R2 thì lưu thư mục cục bộ khi phát triển.
- Trang lớp cho GVCN: tiến độ theo cuộc thi (danh sách/lưới ảnh), ma trận cả năm, sao chép danh sách chưa nộp, in phiếu PIN, xuất Excel.
- Báo cáo theo lớp (đếm bằng SQL groupBy), lọc năm học/cuộc thi/khối, xuất Excel.
- Quản trị: nhập học sinh dán từ Excel theo lô 100 dòng (tự tạo lớp, bỏ trùng, sinh PIN), quản lý giáo viên, kết chuyển năm học có lịch sử lớp (ClassMembership) để giữ đúng báo cáo năm cũ.
- Database thử trên máy bằng PGlite (`npm run db:local`) và dữ liệu demo ~1000 học sinh.
