import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { compareVietnameseName } from "@/lib/names";

export const dynamic = "force-dynamic";

/**
 * Công khai cho màn hình đăng nhập: chỉ trả id và tên học sinh của MỘT lớp.
 * Nếu trong lớp có tên trùng, kèm ngày/tháng sinh để phân biệt.
 */
export const GET = handle(async (_req: Request, { params }: { params: { id: string } }) => {
  const students = await db.student.findMany({
    where: { classId: params.id, isActive: true, classRoom: { isActive: true } },
    select: { id: true, name: true, dob: true },
  });
  const count = new Map<string, number>();
  for (const s of students) {
    const k = s.name.toLowerCase();
    count.set(k, (count.get(k) || 0) + 1);
  }

  const list = students
    .map((s) => {
      const dup = (count.get(s.name.toLowerCase()) || 0) > 1;
      const hint =
        dup && s.dob
          ? `${String(s.dob.getUTCDate()).padStart(2, "0")}/${String(s.dob.getUTCMonth() + 1).padStart(2, "0")}`
          : null;
      return { id: s.id, name: s.name, hint };
    })
    .sort((a, b) => compareVietnameseName(a.name, b.name));
  return ok({ students: list });
});
