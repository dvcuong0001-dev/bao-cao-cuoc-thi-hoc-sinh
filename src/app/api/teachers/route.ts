import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { teacherCreateSchema } from "@/lib/validations";
import { generatePin, hashPin, isLocked } from "@/lib/pin";
import { compareVietnameseName } from "@/lib/names";
import type { PinSlip, TeacherDto, TeacherRole, ViewerRole } from "@/types";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireTeacher({ admin: true });
  const teachers = await db.teacher.findMany({
    include: {
      classAccess: {
        where: { classRoom: { isActive: true } },
        include: { classRoom: { select: { name: true } } },
      },
    },
  });
  const data: TeacherDto[] = teachers
    .map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      role: t.role as TeacherRole,
      isActive: t.isActive,
      mustChangePin: t.mustChangePin,
      lockedMinutes: isLocked(t.lockedUntil),
      classes: t.classAccess.map((a) => ({ classId: a.classId, className: a.classRoom.name, role: a.role as ViewerRole })),
    }))
    .sort((a, b) => compareVietnameseName(a.name, b.name));
  return ok({ teachers: data });
});

/** Thêm 1 hoặc nhiều giáo viên (mỗi dòng 1 tên), trả về PIN ban đầu để in phiếu */
export const POST = handle(async (req: Request) => {
  const me = await requireTeacher({ admin: true });
  const { names, role } = await parseBody(req, teacherCreateSchema);
  if (role === "ADMIN" && me.role !== "SUPER_ADMIN") return fail(403, "Chỉ Tổng quản trị được tạo quản trị viên");
  const slips: PinSlip[] = [];
  for (const name of names) {
    const pin = generatePin();
    await db.teacher.create({ data: { name, role, pinHash: await hashPin(pin) } });
    slips.push({ name, className: role === "ADMIN" ? "Quản trị viên" : "Giáo viên", pin });
  }
  return ok({ slips }, { status: 201 });
});
