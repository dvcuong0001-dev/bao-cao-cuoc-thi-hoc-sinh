import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { HttpError } from "./http";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SessionPayload,
  TeacherRole,
  createSessionToken,
  readSessionToken,
} from "./session";

export type TeacherUser = { kind: "teacher"; id: string; name: string; role: TeacherRole; mustChangePin: boolean };
export type StudentUser = {
  kind: "student";
  id: string;
  name: string;
  classId: string;
  className: string;
  mustChangePin: boolean;
};

export function getSession(): SessionPayload | null {
  return readSessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(res: NextResponse, payload: SessionPayload) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function isAdmin(user: { role: TeacherRole }) {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

/** Bắt buộc là giáo viên còn hoạt động (kiểm tra lại trong DB mỗi lần gọi) */
export async function requireTeacher(opts: { admin?: boolean; superAdmin?: boolean } = {}): Promise<TeacherUser> {
  const s = getSession();
  if (!s || s.kind !== "teacher") throw new HttpError(401, "Vui lòng đăng nhập bằng tài khoản giáo viên");
  const t = await db.teacher.findUnique({
    where: { id: s.id },
    select: { id: true, name: true, role: true, isActive: true, mustChangePin: true },
  });
  if (!t || !t.isActive) throw new HttpError(401, "Tài khoản đã bị khoá hoặc không tồn tại");
  const user: TeacherUser = {
    kind: "teacher",
    id: t.id,
    name: t.name,
    role: t.role as TeacherRole,
    mustChangePin: t.mustChangePin,
  };
  if (opts.superAdmin && user.role !== "SUPER_ADMIN") throw new HttpError(403, "Chỉ Tổng quản trị được thao tác");
  if (opts.admin && !isAdmin(user)) throw new HttpError(403, "Chỉ quản trị viên được thao tác");
  return user;
}

/** Bắt buộc là học sinh còn hoạt động, lớp lấy theo DB (không tin vào cookie) */
export async function requireStudent(): Promise<StudentUser> {
  const s = getSession();
  if (!s || s.kind !== "student") throw new HttpError(401, "Vui lòng đăng nhập bằng tài khoản học sinh");
  const st = await db.student.findUnique({
    where: { id: s.id },
    select: {
      id: true,
      name: true,
      classId: true,
      isActive: true,
      mustChangePin: true,
      classRoom: { select: { name: true } },
    },
  });
  if (!st || !st.isActive) throw new HttpError(401, "Tài khoản đã bị khoá hoặc không tồn tại");
  return {
    kind: "student",
    id: st.id,
    name: st.name,
    classId: st.classId,
    className: st.classRoom.name,
    mustChangePin: st.mustChangePin,
  };
}
