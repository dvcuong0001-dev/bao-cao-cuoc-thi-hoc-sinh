import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { teacherUpdateSchema } from "@/lib/validations";
import { generatePin, hashPin } from "@/lib/pin";

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireTeacher({ admin: true });
  const body = await parseBody(req, teacherUpdateSchema);
  const target = await db.teacher.findUnique({ where: { id: params.id }, select: { role: true } });
  if (!target) return fail(404, "Không tìm thấy giáo viên");
  if (target.role === "SUPER_ADMIN" && (body.role !== undefined || body.isActive === false)) {
    return fail(400, "Không thể đổi quyền hoặc khoá Tổng quản trị");
  }
  if ((body.role === "ADMIN" || target.role === "ADMIN") && body.role !== undefined && me.role !== "SUPER_ADMIN") {
    return fail(403, "Chỉ Tổng quản trị được thay đổi quyền quản trị viên");
  }
  if (params.id === me.id && body.isActive === false) return fail(400, "Không thể tự khoá tài khoản của mình");
  await db.teacher.update({ where: { id: params.id }, data: body });
  return ok({ ok: true });
});

/** Cấp lại PIN cho giáo viên (đồng thời mở khoá) */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireTeacher({ admin: true });
  const target = await db.teacher.findUnique({ where: { id: params.id }, select: { name: true, role: true } });
  if (!target) return fail(404, "Không tìm thấy giáo viên");
  if (target.role !== "TEACHER" && me.role !== "SUPER_ADMIN" && params.id !== me.id) {
    return fail(403, "Chỉ Tổng quản trị được cấp lại PIN cho quản trị viên");
  }
  const pin = generatePin();
  await db.teacher.update({
    where: { id: params.id },
    data: { pinHash: await hashPin(pin), mustChangePin: true, failedAttempts: 0, lockedUntil: null },
  });
  return ok({ slip: { name: target.name, className: "Giáo viên", pin } });
});
