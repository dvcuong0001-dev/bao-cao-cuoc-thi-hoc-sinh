import { db } from "@/lib/db";
import { handle, parseBody, fail } from "@/lib/http";
import { loginSchema } from "@/lib/validations";
import { attemptLogin } from "@/lib/login";
import type { TeacherRole } from "@/lib/session";

export const POST = handle(async (req: Request) => {
  const { id, pin } = await parseBody(req, loginSchema);
  const t = await db.teacher.findUnique({ where: { id } });
  if (!t || !t.isActive) return fail(404, "Không tìm thấy giáo viên");
  return attemptLogin("teacher", t.id, t, pin, { kind: "teacher", id: t.id, name: t.name, role: t.role as TeacherRole });
});
