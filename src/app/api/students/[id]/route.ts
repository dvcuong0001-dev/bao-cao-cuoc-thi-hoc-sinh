import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { parseDob, studentUpdateSchema } from "@/lib/validations";

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const body = await parseBody(req, studentUpdateSchema);
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.code !== undefined) data.code = body.code;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.classId !== undefined) data.classId = body.classId;
  if (body.dob !== undefined) {
    const dob = parseDob(body.dob);
    if (body.dob && !dob) return fail(400, "Ngày sinh không hợp lệ (dd/mm/yyyy)");
    data.dob = dob;
  }
  const student = await db.student.update({ where: { id: params.id }, data });
  if (body.classId !== undefined) {
    await db.classMembership.createMany({ data: [{ studentId: student.id, classId: body.classId }], skipDuplicates: true });
  }
  return ok({ student: { id: student.id } });
});

/** Chỉ xoá hẳn học sinh chưa từng nộp bài; có dữ liệu thì dùng "ngừng hoạt động" để giữ báo cáo */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const count = await db.studentSubmission.count({ where: { studentId: params.id } });
  if (count > 0) return fail(400, "Học sinh đã có bài nộp. Hãy chuyển sang ngừng hoạt động để giữ báo cáo.");
  await db.student.delete({ where: { id: params.id } });
  return ok({ ok: true });
});
