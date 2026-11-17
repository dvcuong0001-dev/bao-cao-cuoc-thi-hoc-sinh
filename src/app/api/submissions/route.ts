import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/http";
import { detectImage } from "@/lib/image-check";
import { deleteObjects, putObject } from "@/lib/storage";
import { submissionBlockedReason } from "@/lib/competitions";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_THUMB_BYTES = 300 * 1024;

/**
 * Học sinh nộp minh chứng: 1 request multipart gồm ảnh chính + ảnh thu nhỏ (đã nén trên điện thoại).
 * Server kiểm tra quyền, hạn nộp, định dạng ảnh rồi ghi lên R2 với tên file do server đặt.
 */
export const POST = handle(async (req: Request) => {
  const me = await requireStudent();
  const form = await req.formData().catch(() => null);
  if (!form) return fail(400, "Dữ liệu gửi lên không hợp lệ");

  const competitionId = String(form.get("competitionId") || "");
  const note = String(form.get("note") || "").trim().slice(0, 500) || null;
  const image = form.get("image");
  const thumb = form.get("thumb");
  if (!competitionId) return fail(400, "Thiếu cuộc thi");
  if (!(image instanceof File)) return fail(400, "Vui lòng chọn ảnh minh chứng");

  const comp = await db.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      academicYear: true,
      deadline: true,
      status: true,
      allowLateSubmission: true,
      isArchived: true,
      classes: { where: { classId: me.classId }, select: { classId: true } },
    },
  });
  if (!comp || comp.classes.length === 0) return fail(404, "Cuộc thi không được giao cho lớp của bạn");
  const blocked = submissionBlockedReason(comp);
  if (blocked) return fail(400, blocked);

  if (image.size > MAX_IMAGE_BYTES) return fail(413, "Ảnh quá lớn (tối đa 1.5MB sau khi nén)");
  const imageBytes = new Uint8Array(await image.arrayBuffer());
  const kind = detectImage(imageBytes);
  if (!kind) return fail(400, "File không phải ảnh JPG, PNG hoặc WEBP");

  let thumbBytes: Uint8Array | null = null;
  let thumbKind = null;
  if (thumb instanceof File && thumb.size > 0) {
    if (thumb.size > MAX_THUMB_BYTES) return fail(413, "Ảnh thu nhỏ quá lớn");
    thumbBytes = new Uint8Array(await thumb.arrayBuffer());
    thumbKind = detectImage(thumbBytes);
    if (!thumbKind) return fail(400, "Ảnh thu nhỏ không hợp lệ");
  }

  const base = `${comp.academicYear}/${comp.id}/${safe(me.className)}/${me.id}`;
  const imageKey = `${base}.${kind.ext}`;
  const thumbKey = thumbKind ? `${base}_thumb.${thumbKind.ext}` : null;

  await putObject(imageKey, imageBytes, kind.mime);
  if (thumbKey && thumbBytes && thumbKind) await putObject(thumbKey, thumbBytes, thumbKind.mime);

  const existing = await db.studentSubmission.findUnique({
    where: { competitionId_studentId: { competitionId: comp.id, studentId: me.id } },
    select: { imageKey: true, thumbKey: true },
  });
  const isLate = Date.now() > comp.deadline.getTime();

  const saved = await db.studentSubmission.upsert({
    where: { competitionId_studentId: { competitionId: comp.id, studentId: me.id } },
    // Nộp lại: giữ thời điểm và trạng thái lần nộp đầu, chỉ thay ảnh/ghi chú
    update: { imageKey, thumbKey, sizeBytes: image.size, note },
    create: {
      competitionId: comp.id,
      studentId: me.id,
      classIdAtSubmit: me.classId,
      status: isLate ? "LATE" : "ON_TIME",
      imageKey,
      thumbKey,
      sizeBytes: image.size,
      note,
    },
  });

  // Ảnh cũ khác đuôi file thì xoá để không sinh rác
  const stale = [existing?.imageKey, existing?.thumbKey].filter(
    (k): k is string => Boolean(k) && k !== imageKey && k !== thumbKey
  );
  if (stale.length) await deleteObjects(stale).catch((e) => console.warn("Không xoá được ảnh cũ", e));

  return ok({
    submission: {
      id: saved.id,
      status: saved.status,
      submittedAt: saved.submittedAt.toISOString(),
      note: saved.note,
      hasImage: true,
    },
  });
});

function safe(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}
