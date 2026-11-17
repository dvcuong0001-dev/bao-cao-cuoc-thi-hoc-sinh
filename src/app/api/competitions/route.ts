import { db } from "@/lib/db";
import { getSession, requireStudent, requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { competitionSchema } from "@/lib/validations";
import { getAcademicYear } from "@/lib/academic-year";
import { accessibleClassIds } from "@/lib/permissions";
import { competitionInclude, toCompetitionDto } from "@/lib/competitions";
import type { StudentCompetitionDto } from "@/types";

export const dynamic = "force-dynamic";

/**
 * - Học sinh: các cuộc thi giao cho lớp mình + bài nộp của mình
 * - Giáo viên: cuộc thi giao cho các lớp mình được xem; Admin: tất cả
 * Lọc năm học bằng ?year=2026-2027 (mặc định năm hiện tại, ALL = tất cả)
 */
export const GET = handle(async (req: Request) => {
  const s = getSession();
  if (s?.kind === "student") {
    const me = await requireStudent();
    const comps = await db.competition.findMany({
      where: { classes: { some: { classId: me.classId } } },
      include: { ...competitionInclude, submissions: { where: { studentId: me.id } } },
      orderBy: { deadline: "desc" },
    });
    const data: StudentCompetitionDto[] = comps.map((c) => {
      const sub = c.submissions[0];
      return {
        ...toCompetitionDto(c),
        mySubmission: sub
          ? {
              id: sub.id,
              status: sub.status as "ON_TIME" | "LATE",
              submittedAt: sub.submittedAt.toISOString(),
              note: sub.note,
              hasImage: Boolean(sub.imageKey),
            }
          : null,
      };
    });
    return ok({ competitions: data });
  }

  const user = await requireTeacher();
  const year = new URL(req.url).searchParams.get("year") || getAcademicYear();
  const ids = await accessibleClassIds(user);
  const comps = await db.competition.findMany({
    where: {
      ...(year === "ALL" ? {} : { academicYear: year }),
      ...(ids ? { classes: { some: { classId: { in: ids } } } } : {}),
    },
    include: competitionInclude,
    orderBy: { deadline: "desc" },
  });
  return ok({ competitions: comps.map(toCompetitionDto) });
});

export const POST = handle(async (req: Request) => {
  const user = await requireTeacher({ admin: true });
  const body = await parseBody(req, competitionSchema);
  const deadline = new Date(body.deadline);
  const classIds = Array.from(new Set(body.classIds));
  const found = await db.classRoom.count({ where: { id: { in: classIds } } });
  if (found !== classIds.length) return fail(400, "Có lớp không tồn tại, vui lòng tải lại trang");

  const created = await db.competition.create({
    data: {
      title: body.title,
      description: body.description,
      link: body.link,
      deadline,
      allowLateSubmission: body.allowLateSubmission,
      academicYear: getAcademicYear(deadline),
      creatorId: user.id,
      classes: { createMany: { data: classIds.map((classId) => ({ classId })) } },
    },
    include: competitionInclude,
  });
  return ok({ competition: toCompetitionDto(created) }, { status: 201 });
});
