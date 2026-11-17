import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireStudent, requireTeacher } from "@/lib/auth";
import { handle, fail } from "@/lib/http";
import { getClassAccess } from "@/lib/permissions";
import { getViewUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Xem ảnh minh chứng: kiểm tra quyền rồi chuyển hướng tới đường dẫn có thời hạn trên R2.
 * Dùng trực tiếp trong <img src="/api/submissions/ID/image?size=thumb">.
 */
export const GET = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const sub = await db.studentSubmission.findUnique({
    where: { id: params.id },
    select: { studentId: true, classIdAtSubmit: true, imageKey: true, thumbKey: true, student: { select: { classId: true } } },
  });
  if (!sub) return fail(404, "Không tìm thấy bài nộp");

  const s = getSession();
  if (s?.kind === "student") {
    const me = await requireStudent();
    if (me.id !== sub.studentId) return fail(403, "Bạn chỉ xem được ảnh của mình");
  } else {
    const user = await requireTeacher();
    const access =
      (await getClassAccess(user, sub.classIdAtSubmit)) ||
      (sub.student.classId !== sub.classIdAtSubmit ? await getClassAccess(user, sub.student.classId) : null);
    if (!access) return fail(403, "Bạn không có quyền xem ảnh này");
  }

  const wantThumb = new URL(req.url).searchParams.get("size") === "thumb";
  const key = (wantThumb && sub.thumbKey) || sub.imageKey;
  if (!key) return fail(404, "Ảnh đã được dọn sau khi lưu trữ");

  const url = await getViewUrl(key);
  const res = NextResponse.redirect(new URL(url, req.url), 302);
  res.headers.set("Cache-Control", "private, max-age=600");
  return res;
});
