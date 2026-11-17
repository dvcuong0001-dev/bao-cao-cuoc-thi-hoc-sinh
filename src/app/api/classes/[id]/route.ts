import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { classSchema } from "@/lib/validations";

type Ctx = { params: { id: string } };

const patchSchema = classSchema.partial().extend({ isActive: z.boolean().optional() });

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const body = await parseBody(req, patchSchema);
  const updated = await db.classRoom.update({ where: { id: params.id }, data: body });
  return ok({ classRoom: updated });
});

/** Chỉ xoá được lớp chưa có học sinh; lớp đã có dữ liệu thì dùng "ngừng hoạt động" */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const count = await db.student.count({ where: { classId: params.id } });
  if (count > 0) return fail(400, "Lớp còn học sinh, không thể xoá. Hãy chuyển học sinh hoặc ngừng hoạt động lớp.");
  await db.classRoom.delete({ where: { id: params.id } });
  return ok({ ok: true });
});
