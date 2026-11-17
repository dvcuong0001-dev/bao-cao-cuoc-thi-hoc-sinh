import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { requireClassAccess } from "@/lib/permissions";
import { isLocked } from "@/lib/pin";
import { compareVietnameseName } from "@/lib/names";
import type { StudentRowDto } from "@/types";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireTeacher();
  await requireClassAccess(user, params.id, "view");
  const all = new URL(req.url).searchParams.get("all") === "1";
  const students = await db.student.findMany({
    where: { classId: params.id, ...(all ? {} : { isActive: true }) },
    select: { id: true, name: true, code: true, dob: true, isActive: true, mustChangePin: true, lockedUntil: true },
  });
  const data: StudentRowDto[] = students
    .map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      dob: s.dob ? s.dob.toISOString() : null,
      isActive: s.isActive,
      mustChangePin: s.mustChangePin,
      lockedMinutes: isLocked(s.lockedUntil),
    }))
    .sort((a, b) => compareVietnameseName(a.name, b.name));
  return ok({ students: data });
});
