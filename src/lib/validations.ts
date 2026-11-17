import { z } from "zod";

export const pinSchema = z.string().regex(/^\d{4,8}$/, "Mã PIN gồm 4 đến 8 chữ số");
export const idSchema = z.string().min(1, "Thiếu mã định danh").max(64);

export const loginSchema = z.object({ id: idSchema, pin: z.string().min(1, "Vui lòng nhập mã PIN").max(8) });

export const changePinSchema = z.object({
  currentPin: z.string().min(1, "Vui lòng nhập PIN hiện tại").max(8),
  newPin: z.string().regex(/^\d{6}$/, "PIN mới phải gồm đúng 6 chữ số"),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const classSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên lớp").max(20),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, "Năm học dạng 2026-2027").optional(),
});

export const viewersSchema = z.object({
  viewers: z
    .array(z.object({ teacherId: idSchema, role: z.enum(["HOMEROOM", "VIEWER"]) }))
    .max(50),
});

export const studentImportSchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  rows: z
    .array(
      z.object({
        className: z.string().trim().min(1).max(20),
        name: z.string().trim().min(2).max(100),
        dob: z.string().optional().nullable(),
        code: z.string().trim().max(30).optional().nullable(),
      })
    )
    .min(1, "Không có dòng nào để nhập")
    .max(200, "Mỗi lần nhập tối đa 200 học sinh"),
});

export const studentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  dob: z.string().optional().nullable(),
  code: optionalText(30),
  classId: idSchema.optional(),
  isActive: z.boolean().optional(),
});

export const teacherCreateSchema = z.object({
  names: z.array(z.string().trim().min(2).max(100)).min(1).max(100),
  role: z.enum(["ADMIN", "TEACHER"]).default("TEACHER"),
});

export const teacherUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: optionalText(20),
  role: z.enum(["ADMIN", "TEACHER"]).optional(),
  isActive: z.boolean().optional(),
});

export const competitionSchema = z.object({
  title: z.string().trim().min(3, "Tên cuộc thi tối thiểu 3 ký tự").max(200),
  description: optionalText(2000),
  link: optionalText(500).refine((v) => !v || /^https?:\/\//i.test(v), "Đường dẫn phải bắt đầu bằng http(s)://"),
  deadline: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Hạn chót không hợp lệ"),
  allowLateSubmission: z.boolean().default(true),
  classIds: z.array(idSchema).min(1, "Chọn ít nhất 1 lớp").max(200),
});

export const competitionPatchSchema = competitionSchema.partial().extend({
  status: z.enum(["ACTIVE", "CLOSED_EARLY"]).optional(),
});

export const rolloverSchema = z.object({
  fromYear: z.string().regex(/^\d{4}-\d{4}$/),
  maxGrade: z.coerce.number().int().min(1).max(12),
  copyViewers: z.boolean().default(false),
});

/** "dd/mm/yyyy" hoặc "yyyy-mm-dd" -> Date (UTC 0h) */
export function parseDob(v: string | null | undefined): Date | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return validDate(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  return null;
}

function validDate(y: number, mo: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}
