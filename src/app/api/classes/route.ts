import { db } from "@/lib/db";
import { requireTeacher, isAdmin } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { classSchema } from "@/lib/validations";
import { getAcademicYear, parseGrade } from "@/lib/academic-year";
import { accessibleClassIds } from "@/lib/permissions";
import type { ClassDto, ViewerRole } from "@/types";

export const dynamic = "force-dynamic";

/** Admin: mọi lớp (lọc theo năm học/active); Giáo viên: chỉ lớp được xem */
export const GET = handle(async (req: Request) => {
  const user = await requireTeacher();
  const url = new URL(req.url);
  const year = url.searchParams.get("year");
  const includeInactive = url.searchParams.get("all") === "1";
  const ids = await accessibleClassIds(user);

  const classes = await db.classRoom.findMany({
    where: {
      ...(ids ? { id: { in: ids } } : {}),
      ...(year ? { academicYear: year } : includeInactive ? {} : { isActive: true }),
    },
    include: {
      viewers: { include: { teacher: { select: { name: true } } } },
      _count: { select: { students: { where: { isActive: true } } } },
    },
    orderBy: [{ academicYear: "desc" }, { grade: "asc" }, { name: "asc" }],
  });

  const data: ClassDto[] = classes.map((c) => {
    const mine = c.viewers.find((v) => v.teacherId === user.id);
    return {
      id: c.id,
      name: c.name,
      grade: c.grade,
      academicYear: c.academicYear,
      isActive: c.isActive,
      studentCount: c._count.students,
      viewers: c.viewers.map((v) => ({ teacherId: v.teacherId, name: v.teacher.name, role: v.role as ViewerRole })),
      myAccess: isAdmin(user) || mine?.role === "HOMEROOM" ? "manage" : "view",
    };
  });
  return ok({ classes: data });
});

export const POST = handle(async (req: Request) => {
  await requireTeacher({ admin: true });
  const body = await parseBody(req, classSchema);
  const grade = body.grade ?? parseGrade(body.name);
  if (!grade) return fail(400, "Không xác định được khối từ tên lớp, vui lòng nhập khối");
  const academicYear = body.academicYear ?? getAcademicYear();
  const exists = await db.classRoom.findUnique({ where: { name_academicYear: { name: body.name, academicYear } } });
  if (exists) return fail(409, `Lớp ${body.name} năm học ${academicYear} đã tồn tại`);
  const created = await db.classRoom.create({ data: { name: body.name, grade, academicYear } });
  return ok({ classRoom: created }, { status: 201 });
});
