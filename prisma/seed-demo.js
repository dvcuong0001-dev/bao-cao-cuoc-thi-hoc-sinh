// DỮ LIỆU GIẢ để chạy thử trên máy: 30 lớp (~1000 học sinh), 12 giáo viên, 6 cuộc thi.
// Mọi tài khoản demo có PIN 123456. TUYỆT ĐỐI KHÔNG chạy trên database thật.
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];
const DEM = ["Văn", "Thị", "Minh", "Ngọc", "Gia", "Thanh", "Hoàng", "Quốc", "Bảo", "Khánh"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Khoa", "Lan", "Linh", "Long", "Mai", "Nam", "Ngân", "Phúc", "Quân", "Thảo", "Trang", "Vy"];
const pick = (arr, i) => arr[i % arr.length];

function year(d = new Date()) {
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

async function main() {
  if (process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)) {
    throw new Error("seed-demo chỉ được chạy với database trên máy (localhost)");
  }
  const academicYear = year();
  const pinHash = await bcrypt.hash("123456", 8);

  const admin = await db.teacher.create({ data: { name: "Admin Demo", role: "SUPER_ADMIN", pinHash, mustChangePin: false } });
  const teachers = [];
  for (let i = 0; i < 12; i++) {
    teachers.push(
      await db.teacher.create({
        data: { name: `${pick(HO, i + 3)} ${pick(DEM, i)} ${pick(TEN, i * 3)}`, pinHash, mustChangePin: false },
      })
    );
  }

  const classes = [];
  let n = 0;
  for (const grade of [6, 7, 8, 9]) {
    const count = grade === 9 ? 6 : 8;
    for (let k = 1; k <= count; k++) {
      const c = await db.classRoom.create({ data: { name: `${grade}A${k}`, grade, academicYear } });
      classes.push(c);
      const t = teachers[classes.length % teachers.length];
      await db.classViewer.create({ data: { classId: c.id, teacherId: t.id, role: "HOMEROOM" } });
      const students = [];
      for (let s = 0; s < 34; s++, n++) {
        students.push({
          classId: c.id,
          name: `${pick(HO, n * 7)} ${pick(DEM, n * 3)} ${pick(TEN, n)}`,
          dob: new Date(Date.UTC(2026 - grade - 6, n % 12, (n % 27) + 1)),
          pinHash,
          mustChangePin: false,
        });
      }
      const created = await db.student.createManyAndReturn({ data: students, select: { id: true } });
      await db.classMembership.createMany({ data: created.map((s) => ({ studentId: s.id, classId: c.id })) });
    }
  }
  // Một lớp có thêm người xem (giáo viên bộ môn)
  await db.classViewer.create({ data: { classId: classes[0].id, teacherId: teachers[5].id, role: "VIEWER" } });

  const now = Date.now();
  const day = 86400000;
  const comps = [
    ["Cuộc thi An toàn giao thông", -20],
    ["Tìm hiểu Hiến pháp", -5],
    ["Olympic Tiếng Anh trên mạng", 3],
    ["Phòng chống đuối nước", 10],
    ["Sáng tạo thanh thiếu niên", 25],
    ["Văn hoá đọc", -40],
  ];
  for (const [i, [title, offset]] of comps.entries()) {
    const comp = await db.competition.create({
      data: {
        title,
        deadline: new Date(now + offset * day),
        academicYear,
        creatorId: admin.id,
        link: "https://example.com",
        classes: { createMany: { data: classes.filter((_, j) => i % 2 === 0 || j % 2 === 0).map((c) => ({ classId: c.id })) } },
      },
      include: { classes: true },
    });
    // Giả lập một phần học sinh đã nộp (chưa có ảnh)
    const assigned = await db.student.findMany({ where: { classId: { in: comp.classes.map((x) => x.classId) } }, select: { id: true, classId: true } });
    const subs = assigned
      .filter((_, j) => j % 3 !== 0)
      .map((s, j) => ({
        competitionId: comp.id,
        studentId: s.id,
        classIdAtSubmit: s.classId,
        status: offset < 0 && j % 7 === 0 ? "LATE" : "ON_TIME",
      }));
    for (let k = 0; k < subs.length; k += 100) {
      await db.studentSubmission.createMany({ data: subs.slice(k, k + 100) });
    }
  }
  console.log(`Đã tạo dữ liệu demo năm học ${academicYear}: ${classes.length} lớp, ${n} học sinh, ${teachers.length + 1} giáo viên.`);
  console.log("Mọi tài khoản demo dùng PIN 123456. Admin: 'Admin Demo'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
