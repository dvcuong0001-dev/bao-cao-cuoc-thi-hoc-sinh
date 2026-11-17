import { Prisma } from "@prisma/client";
import type { CompetitionDto } from "@/types";

export const competitionInclude = {
  classes: { include: { classRoom: { select: { name: true, grade: true } } } },
} satisfies Prisma.CompetitionInclude;

type CompetitionWithClasses = Prisma.CompetitionGetPayload<{ include: typeof competitionInclude }>;

export function toCompetitionDto(c: CompetitionWithClasses): CompetitionDto {
  const classes = [...c.classes].sort(
    (a, b) => a.classRoom.grade - b.classRoom.grade || a.classRoom.name.localeCompare(b.classRoom.name, "vi")
  );
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    link: c.link,
    deadline: c.deadline.toISOString(),
    status: c.status as CompetitionDto["status"],
    allowLateSubmission: c.allowLateSubmission,
    academicYear: c.academicYear,
    isArchived: c.isArchived,
    classIds: classes.map((x) => x.classId),
    classNames: classes.map((x) => x.classRoom.name),
    createdAt: c.createdAt.toISOString(),
  };
}

/** Có còn nhận bài không: trả về null nếu được nộp, ngược lại là lý do */
export function submissionBlockedReason(c: {
  status: string;
  deadline: Date;
  allowLateSubmission: boolean;
  isArchived: boolean;
}): string | null {
  if (c.isArchived) return "Cuộc thi đã được lưu trữ, không nhận bài nữa";
  if (c.status === "CLOSED_EARLY") return "Cuộc thi đã kết thúc";
  if (Date.now() > c.deadline.getTime() && !c.allowLateSubmission) return "Đã quá hạn và cuộc thi không nhận bài nộp muộn";
  return null;
}
