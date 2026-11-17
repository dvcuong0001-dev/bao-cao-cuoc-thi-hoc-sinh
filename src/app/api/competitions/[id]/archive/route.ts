import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { deleteObjects } from "@/lib/storage";

/**
 * Lưu trữ cuộc thi: xoá ảnh minh chứng trên kho lưu trữ để giải phóng dung lượng,
 * GIỮ NGUYÊN lịch sử nộp bài (ai nộp, lúc nào, đúng hạn hay muộn).
 * Nên xuất Excel báo cáo trước khi lưu trữ.
 */
export const POST = handle(async (_req: Request, { params }: { params: { id: string } }) => {
  await requireTeacher({ admin: true });
  const subs = await db.studentSubmission.findMany({
    where: { competitionId: params.id },
    select: { imageKey: true, thumbKey: true },
  });
  const keys = subs.flatMap((s) => [s.imageKey, s.thumbKey]).filter((k): k is string => Boolean(k));
  await deleteObjects(keys);
  await db.$transaction([
    db.studentSubmission.updateMany({ where: { competitionId: params.id }, data: { imageKey: null, thumbKey: null } }),
    db.competition.update({ where: { id: params.id }, data: { isArchived: true, archivedAt: new Date() } }),
  ]);
  return ok({ deletedFiles: keys.length });
});
