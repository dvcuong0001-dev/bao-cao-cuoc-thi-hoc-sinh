import { db } from "@/lib/db";
import { handle, parseBody, fail } from "@/lib/http";
import { loginSchema } from "@/lib/validations";
import { attemptLogin } from "@/lib/login";

export const POST = handle(async (req: Request) => {
  const { id, pin } = await parseBody(req, loginSchema);
  const st = await db.student.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      classId: true,
      pinHash: true,
      isActive: true,
      failedAttempts: true,
      lockedUntil: true,
      mustChangePin: true,
      classRoom: { select: { isActive: true } },
    },
  });
  if (!st || !st.isActive || !st.classRoom.isActive) return fail(404, "Không tìm thấy học sinh");
  return attemptLogin("student", st.id, st, pin, { kind: "student", id: st.id, name: st.name, classId: st.classId });
});
