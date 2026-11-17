import { db } from "./db";
import { HttpError } from "./http";
import { TeacherUser, isAdmin } from "./auth";

export type ClassAccess = "manage" | "view";

/**
 * Quyền của giáo viên với một lớp:
 * - Admin: manage mọi lớp
 * - GVCN (HOMEROOM): manage (xem + reset PIN học sinh)
 * - VIEWER: chỉ xem
 */
export async function getClassAccess(user: TeacherUser, classId: string): Promise<ClassAccess | null> {
  if (isAdmin(user)) return "manage";
  const v = await db.classViewer.findUnique({
    where: { classId_teacherId: { classId, teacherId: user.id } },
    select: { role: true },
  });
  if (!v) return null;
  return v.role === "HOMEROOM" ? "manage" : "view";
}

export async function requireClassAccess(user: TeacherUser, classId: string, need: ClassAccess) {
  const access = await getClassAccess(user, classId);
  if (!access) throw new HttpError(403, "Bạn không có quyền xem lớp này");
  if (need === "manage" && access !== "manage") {
    throw new HttpError(403, "Chỉ GVCN hoặc quản trị viên được thao tác với học sinh lớp này");
  }
  return access;
}

/** Danh sách id lớp giáo viên được xem; null nghĩa là xem tất cả (admin) */
export async function accessibleClassIds(user: TeacherUser): Promise<string[] | null> {
  if (isAdmin(user)) return null;
  const rows = await db.classViewer.findMany({ where: { teacherId: user.id }, select: { classId: true } });
  return rows.map((r) => r.classId);
}
