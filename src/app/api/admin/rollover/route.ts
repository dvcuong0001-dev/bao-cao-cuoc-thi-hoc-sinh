import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { rolloverSchema } from "@/lib/validations";
import { nextAcademicYear, promoteClassName } from "@/lib/academic-year";

/**
 * Kết chuyển năm học: 6A1 (2026-2027) -> 7A1 (2027-2028), chuyển học sinh lên lớp mới.
 * Lớp cuối cấp (khối >= maxGrade): học sinh chuyển sang ngừng hoạt động (đã ra trường).
 * Lớp cũ chuyển sang ngừng hoạt động nhưng vẫn giữ để xem báo cáo năm cũ.
 */
export const POST = handle(async (req: Request) => {
  await requireTeacher({ admin: true });
  const { fromYear, maxGrade, copyViewers } = await parseBody(req, rolloverSchema);
  const toYear = nextAcademicYear(fromYear);

  const classes = await db.classRoom.findMany({
    where: { academicYear: fromYear, isActive: true },
    include: { viewers: true },
  });
  if (classes.length === 0) return fail(400, `Không có lớp đang hoạt động trong năm học ${fromYear}`);

  let promoted = 0;
  let graduated = 0;
  for (const c of classes) {
    if (c.grade >= maxGrade) {
      const leaving = await db.student.findMany({ where: { classId: c.id, isActive: true }, select: { id: true } });
      await db.classMembership.createMany({
        data: leaving.map((s) => ({ studentId: s.id, classId: c.id })),
        skipDuplicates: true,
      });
      const r = await db.student.updateMany({ where: { classId: c.id, isActive: true }, data: { isActive: false } });
      graduated += r.count;
    } else {
      const name = promoteClassName(c.name);
      const target = await db.classRoom.upsert({
        where: { name_academicYear: { name, academicYear: toYear } },
        update: { isActive: true },
        create: { name, grade: c.grade + 1, academicYear: toYear },
      });
      const moving = await db.student.findMany({ where: { classId: c.id, isActive: true }, select: { id: true } });
      // Đảm bảo lớp cũ có lịch sử (dữ liệu nhập trước khi có bảng lịch sử) rồi ghi lớp mới
      await db.classMembership.createMany({
        data: moving.flatMap((s) => [
          { studentId: s.id, classId: c.id },
          { studentId: s.id, classId: target.id },
        ]),
        skipDuplicates: true,
      });
      const r = await db.student.updateMany({ where: { classId: c.id, isActive: true }, data: { classId: target.id } });
      promoted += r.count;
      if (copyViewers && c.viewers.length) {
        await db.classViewer.createMany({
          data: c.viewers.map((v) => ({ classId: target.id, teacherId: v.teacherId, role: v.role })),
          skipDuplicates: true,
        });
      }
    }
    await db.classRoom.update({ where: { id: c.id }, data: { isActive: false } });
  }
  return ok({ toYear, classes: classes.length, promoted, graduated });
});
