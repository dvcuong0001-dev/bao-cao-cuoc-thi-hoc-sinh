import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { accessibleClassIds } from "@/lib/permissions";
import { getAcademicYear } from "@/lib/academic-year";
import type { SchoolReportDto, SchoolReportRow } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Báo cáo theo lớp: mỗi lớp một dòng. Đếm bằng SQL (groupBy), không tải toàn bộ bài nộp về.
 * ?year=2026-2027 & ?competitionId=... (bỏ trống = cộng dồn mọi cuộc thi trong năm)
 */
export const GET = handle(async (req: Request) => {
  const user = await requireTeacher();
  const url = new URL(req.url);
  const academicYear = url.searchParams.get("year") || getAcademicYear();
  const competitionId = url.searchParams.get("competitionId") || null;
  const ids = await accessibleClassIds(user);

  const classes = await db.classRoom.findMany({
    where: { academicYear, ...(ids ? { id: { in: ids } } : {}) },
    select: {
      id: true,
      name: true,
      grade: true,
      isActive: true,
      // Lớp đang học: sĩ số hiện tại; lớp năm cũ: số học sinh từng thuộc lớp
      _count: { select: { students: { where: { isActive: true } }, members: true } },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });
  const classIds = classes.map((c) => c.id);

  const comps = await db.competition.findMany({
    where: { academicYear, classes: { some: { classId: { in: classIds } } } },
    select: { id: true, title: true, deadline: true, classes: { select: { classId: true } } },
    orderBy: { deadline: "asc" },
  });
  const selected = competitionId ? comps.filter((c) => c.id === competitionId) : comps;
  const selectedIds = selected.map((c) => c.id);

  const assignedCount = new Map<string, number>();
  for (const c of selected) {
    for (const x of c.classes) assignedCount.set(x.classId, (assignedCount.get(x.classId) || 0) + 1);
  }

  const grouped = await db.studentSubmission.groupBy({
    by: ["classIdAtSubmit", "status"],
    where: { competitionId: { in: selectedIds }, classIdAtSubmit: { in: classIds } },
    _count: { _all: true },
  });
  const counts = new Map<string, { onTime: number; late: number }>();
  for (const g of grouped) {
    const cur = counts.get(g.classIdAtSubmit) || { onTime: 0, late: 0 };
    if (g.status === "LATE") cur.late += g._count._all;
    else cur.onTime += g._count._all;
    counts.set(g.classIdAtSubmit, cur);
  }

  const rows: SchoolReportRow[] = classes.map((c) => {
    const n = assignedCount.get(c.id) || 0;
    const { onTime, late } = counts.get(c.id) || { onTime: 0, late: 0 };
    const studentCount = c.isActive ? c._count.students : c._count.members;
    const assigned = Math.max(studentCount * n, onTime + late);
    return {
      classId: c.id,
      className: c.name,
      grade: c.grade,
      studentCount,
      assigned,
      onTime,
      late,
      missing: Math.max(assigned - onTime - late, 0),
    };
  });

  const dto: SchoolReportDto = {
    academicYear,
    competitionId,
    competitions: comps.map((c) => ({ id: c.id, title: c.title, deadline: c.deadline.toISOString() })),
    rows,
  };
  return ok(dto);
});
