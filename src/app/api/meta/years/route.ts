import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { getAcademicYear } from "@/lib/academic-year";

export const dynamic = "force-dynamic";

/** Danh sách năm học đang có dữ liệu (mới nhất trước) */
export const GET = handle(async () => {
  await requireTeacher();
  const [a, b] = await Promise.all([
    db.classRoom.findMany({ select: { academicYear: true }, distinct: ["academicYear"] }),
    db.competition.findMany({ select: { academicYear: true }, distinct: ["academicYear"] }),
  ]);
  const years = new Set([getAcademicYear(), ...a.map((x) => x.academicYear), ...b.map((x) => x.academicYear)]);
  return ok({ current: getAcademicYear(), years: Array.from(years).sort().reverse() });
});
