import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, parseBody, fail } from "@/lib/http";
import { competitionPatchSchema } from "@/lib/validations";
import { getAcademicYear } from "@/lib/academic-year";
import { competitionInclude, toCompetitionDto } from "@/lib/competitions";
import { deleteObjects } from "@/lib/storage";

type Ctx = { params: { id: string } };

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const body = await parseBody(req, competitionPatchSchema);
  const { classIds, deadline, ...rest } = body;

  const data: Record<string, unknown> = { ...rest };
  if (deadline) {
    data.deadline = new Date(deadline);
    data.academicYear = getAcademicYear(new Date(deadline));
  }

  const ops = [];
  if (classIds) {
    const unique = Array.from(new Set(classIds));
    const found = await db.classRoom.count({ where: { id: { in: unique } } });
    if (found !== unique.length) return fail(400, "Có lớp không tồn tại, vui lòng tải lại trang");
    ops.push(db.competitionClass.deleteMany({ where: { competitionId: params.id } }));
    ops.push(db.competitionClass.createMany({ data: unique.map((classId) => ({ competitionId: params.id, classId })) }));
  }
  ops.push(db.competition.update({ where: { id: params.id }, data }));
  await db.$transaction(ops);

  const updated = await db.competition.findUniqueOrThrow({ where: { id: params.id }, include: competitionInclude });
  return ok({ competition: toCompetitionDto(updated) });
});

/** Xoá cuộc thi: xoá ảnh trên kho lưu trữ trước, sau đó xoá dữ liệu */
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireTeacher({ admin: true });
  const subs = await db.studentSubmission.findMany({
    where: { competitionId: params.id },
    select: { imageKey: true, thumbKey: true },
  });
  await deleteObjects(subs.flatMap((s) => [s.imageKey, s.thumbKey]).filter((k): k is string => Boolean(k)));
  await db.competition.delete({ where: { id: params.id } });
  return ok({ ok: true });
});
