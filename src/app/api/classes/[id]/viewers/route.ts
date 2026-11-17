import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody } from "@/lib/http";
import { viewersSchema } from "@/lib/validations";

/** Ghi đè toàn bộ danh sách người xem của lớp (1 hoặc nhiều người, có thể nhiều GVCN) */
export const PUT = handle(async (req: Request, { params }: { params: { id: string } }) => {
  await requireTeacher({ admin: true });
  const { viewers } = await parseBody(req, viewersSchema);
  const unique = new Map(viewers.map((v) => [v.teacherId, v.role]));
  await db.$transaction([
    db.classViewer.deleteMany({ where: { classId: params.id } }),
    db.classViewer.createMany({
      data: Array.from(unique, ([teacherId, role]) => ({ classId: params.id, teacherId, role })),
    }),
  ]);
  return ok({ ok: true });
});
