import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { handle, ok, fail } from "@/lib/http";
import { requireClassAccess } from "@/lib/permissions";
import { generatePin, hashPin } from "@/lib/pin";
import type { PinSlip } from "@/types";

/**
 * GVCN/admin cấp lại PIN cho 1 học sinh (đồng thời mở khoá).
 * Body { unlockOnly: true } chỉ mở khoá, giữ nguyên PIN.
 */
export const POST = handle(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireTeacher();
  const st = await db.student.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, classId: true, dob: true, classRoom: { select: { name: true } } },
  });
  if (!st) return fail(404, "Không tìm thấy học sinh");
  await requireClassAccess(user, st.classId, "manage");

  const body = await req.json().catch(() => ({}));
  if (body?.unlockOnly) {
    await db.student.update({ where: { id: st.id }, data: { failedAttempts: 0, lockedUntil: null } });
    return ok({ ok: true });
  }

  const pin = generatePin();
  await db.student.update({
    where: { id: st.id },
    data: { pinHash: await hashPin(pin), mustChangePin: true, failedAttempts: 0, lockedUntil: null },
  });
  const slip: PinSlip = { name: st.name, className: st.classRoom.name, pin, dob: st.dob?.toISOString() ?? null };
  return ok({ slip });
});
