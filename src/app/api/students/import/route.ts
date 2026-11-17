import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody } from "@/lib/http";
import { parseDob, studentImportSchema } from "@/lib/validations";
import { getAcademicYear, parseGrade } from "@/lib/academic-year";
import { generatePin, hashPin } from "@/lib/pin";
import { normalizeVi } from "@/lib/names";
import type { PinSlip } from "@/types";

/**
 * Nhập học sinh theo lô (tối đa 200 dòng/lần; giao diện tự chia lô).
 * - Lớp chưa có thì tự tạo trong năm học được chọn
 * - Bỏ qua học sinh trùng (cùng lớp, cùng tên, cùng ngày sinh)
 * - Trả về PIN của học sinh mới để in phiếu (chỉ hiển thị một lần)
 */
export const POST = handle(async (req: Request) => {
  await requireTeacher({ admin: true });
  const { rows, academicYear: yearInput } = await parseBody(req, studentImportSchema);
  const academicYear = yearInput ?? getAcademicYear();

  const created: PinSlip[] = [];
  const skipped: { name: string; className: string; reason: string }[] = [];

  const classNames = Array.from(new Set(rows.map((r) => r.className.toUpperCase())));
  const classMap = new Map<string, string>();
  for (const name of classNames) {
    const grade = parseGrade(name);
    if (!grade) continue;
    const c = await db.classRoom.upsert({
      where: { name_academicYear: { name, academicYear } },
      update: {},
      create: { name, grade, academicYear },
      select: { id: true },
    });
    classMap.set(name, c.id);
  }

  const existing = await db.student.findMany({
    where: { classId: { in: Array.from(classMap.values()) } },
    select: { classId: true, name: true, dob: true },
  });
  const key = (classId: string, name: string, dob: Date | null) =>
    `${classId}|${normalizeVi(name)}|${dob ? dob.toISOString().slice(0, 10) : ""}`;
  const seen = new Set(existing.map((s) => key(s.classId, s.name, s.dob)));

  const toCreate = [];
  for (const r of rows) {
    const className = r.className.toUpperCase();
    const classId = classMap.get(className);
    if (!classId) {
      skipped.push({ name: r.name, className: r.className, reason: "Tên lớp phải bắt đầu bằng số khối (VD: 6A1)" });
      continue;
    }
    const dob = parseDob(r.dob);
    if (r.dob && !dob) {
      skipped.push({ name: r.name, className, reason: `Ngày sinh "${r.dob}" không hợp lệ (dd/mm/yyyy)` });
      continue;
    }
    const k = key(classId, r.name, dob);
    if (seen.has(k)) {
      skipped.push({ name: r.name, className, reason: "Đã có trong lớp" });
      continue;
    }
    seen.add(k);
    const pin = generatePin();
    toCreate.push({ classId, name: normalizeName(r.name), dob, code: r.code || null, pinHash: await hashPin(pin) });
    created.push({ name: normalizeName(r.name), className, pin, dob: dob?.toISOString() ?? null });
  }

  if (toCreate.length) {
    const rowsCreated = await db.student.createManyAndReturn({ data: toCreate, select: { id: true, classId: true } });
    await db.classMembership.createMany({
      data: rowsCreated.map((s) => ({ studentId: s.id, classId: s.classId })),
      skipDuplicates: true,
    });
  }
  return ok({ created, skipped, academicYear });
});

/** "nguyễn  văn an" -> "Nguyễn Văn An" */
function normalizeName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("vi") + w.slice(1).toLocaleLowerCase("vi"))
    .join(" ");
}
