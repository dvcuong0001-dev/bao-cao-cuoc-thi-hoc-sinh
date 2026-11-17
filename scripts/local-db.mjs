// Chạy PostgreSQL nhúng (PGlite) trên máy để thử app mà không cần Neon.
// Dữ liệu lưu ở thư mục .local-db/. Chỉ dùng khi phát triển, KHÔNG dùng cho production.
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.LOCAL_DB_PORT || 5433);
const db = await PGlite.create("./.local-db");
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
await server.start();

console.log(`PostgreSQL chạy thử đang mở tại cổng ${PORT}`);
console.log(
  `DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"`
);
console.log("Nhấn Ctrl+C để dừng.");

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
// Một kết nối bị ngắt đột ngột không được làm dừng cả server
process.on("uncaughtException", (err) => console.warn("Bỏ qua lỗi kết nối:", err.code || err.message));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
