import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { requireClassAccess } from "@/lib/permissions";
import { generatePin, hashPin } from "@/lib/pin";
import { compareVietnameseName } from "@/lib/names";
import type { PinSlip } from "@/types";

/**
 * Cấp lại PIN cho cả lớp (GVCN hoặc admin). Có thể chỉ cấp cho những em chưa đổi PIN.
 * PIN chỉ trả về MỘT lần ở đây để in phiếu, DB chỉ lưu bản mã hoá.
 */
export const POST = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireTeacher();
  await requireClassAccess(user, params.id, "manage");
  const body = await req.json().catch(() => ({}));
  const onlyNotChanged = body?.onlyNotChanged !== false;

  const classRoom = await db.classRoom.findUniqueOrThrow({ where: { id: params.id }, select: { name: true } });
  const students = await db.student.findMany({
    where: { classId: params.id, isActive: true, ...(onlyNotChanged ? { mustChangePin: true } : {}) },
    select: { id: true, name: true, dob: true },
  });

  const slips: PinSlip[] = [];
  const updates = [];
  for (const s of students) {
    const pin = generatePin();
    updates.push(
      db.student.update({
        where: { id: s.id },
        data: { pinHash: await hashPin(pin), mustChangePin: true, failedAttempts: 0, lockedUntil: null },
      })
    );
    slips.push({ name: s.name, className: classRoom.name, pin, dob: s.dob?.toISOString() ?? null });
  }
  await db.$transaction(updates);
  slips.sort((a, b) => compareVietnameseName(a.name, b.name));
  return ok({ slips });
});
