// Tạo tài khoản Tổng quản trị đầu tiên (chỉ chạy khi chưa có).
// Cách dùng: npm run db:seed
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  const existing = await db.teacher.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log(`Đã có Tổng quản trị: ${existing.name}. Không tạo thêm.`);
    return;
  }
  const name = process.env.SEED_ADMIN_NAME || "Quản trị viên";
  const pin = process.env.SEED_ADMIN_PIN || String(crypto.randomInt(100000, 1000000));
  await db.teacher.create({
    data: { name, role: "SUPER_ADMIN", pinHash: await bcrypt.hash(pin, 8), mustChangePin: true },
  });
  console.log("Đã tạo Tổng quản trị:");
  console.log(`  Tên đăng nhập: ${name}`);
  console.log(`  PIN tạm thời : ${pin}  (bắt buộc đổi ở lần đăng nhập đầu)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
