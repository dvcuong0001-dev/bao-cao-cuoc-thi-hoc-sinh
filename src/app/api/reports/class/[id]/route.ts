import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { requireClassAccess } from "@/lib/permissions";
import { isLocked } from "@/lib/pin";
import { cellStatus } from "@/lib/status";
import { compareVietnameseName } from "@/lib/names";
import type { ClassReportDto } from "@/types";

export const dynamic = "force-dynamic";

/** Ma trận học sinh x cuộc thi của một lớp (khoảng 40 x N), dùng cho GVCN và người xem */
export const GET = handle(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireTeacher();
  const access = await requireClassAccess(user, params.id, "view");

  const classRoom = await db.classRoom.findUniqueOrThrow({
    where: { id: params.id },
    select: { id: true, name: true, academicYear: true, isActive: true },
  });
  const comps = await db.competition.findMany({
    where: { classes: { some: { classId: params.id } } },
    select: { id: true, title: true, deadline: true, status: true, isArchived: true },
    orderBy: { deadline: "asc" },
  });
  const compIds = comps.map((c) => c.id);

  // Lớp đang hoạt động: học sinh hiện tại. Lớp năm cũ: mọi học sinh từng thuộc lớp (theo lịch sử).
  // Cộng thêm học sinh đã nộp khi còn ở lớp này để không mất bài nộp nào.
  const pastIds = await db.studentSubmission.findMany({
    where: { classIdAtSubmit: params.id },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const students = await db.student.findMany({
    where: {
      OR: [
        { classId: params.id, isActive: true },
        ...(classRoom.isActive ? [] : [{ memberships: { some: { classId: params.id } } }]),
        { id: { in: pastIds.map((p) => p.studentId) } },
      ],
    },
    select: { id: true, name: true, code: true, dob: true, isActive: true, mustChangePin: true, lockedUntil: true },
  });
  students.sort((a, b) => compareVietnameseName(a.name, b.name));

  const subs = await db.studentSubmission.findMany({
    where: { competitionId: { in: compIds }, studentId: { in: students.map((s) => s.id) } },
    select: { id: true, competitionId: true, studentId: true, status: true, submittedAt: true, imageKey: true, note: true },
  });
  const subMap = new Map(subs.map((s) => [`${s.studentId}|${s.competitionId}`, s]));

  const cells: ClassReportDto["cells"] = {};
  for (const st of students) {
    cells[st.id] = {};
    for (const c of comps) {
      const sub = subMap.get(`${st.id}|${c.id}`);
      cells[st.id][c.id] = {
        status: cellStatus(sub, c),
        ...(sub
          ? { submissionId: sub.id, submittedAt: sub.submittedAt.toISOString(), hasImage: Boolean(sub.imageKey), note: sub.note }
          : {}),
      };
    }
  }

  const dto: ClassReportDto = {
    classRoom: { id: classRoom.id, name: classRoom.name, academicYear: classRoom.academicYear },
    access,
    competitions: comps.map((c) => ({ ...c, deadline: c.deadline.toISOString() })),
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      dob: s.dob?.toISOString() ?? null,
      isActive: s.isActive,
      mustChangePin: s.mustChangePin,
      lockedMinutes: isLocked(s.lockedUntil),
    })),
    cells,
  };
  return ok(dto);
});
