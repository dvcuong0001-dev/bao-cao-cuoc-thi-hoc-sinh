import { normalizeVi } from "@/lib/names";

export type ParsedStudentRow = { className: string; name: string; dob: string | null; code: string | null };

/**
 * Đọc dữ liệu dán từ Excel. Thứ tự cột: [STT] | Lớp | Họ và tên | Ngày sinh | Mã HS
 * (STT, ngày sinh và mã HS không bắt buộc). Dòng tiêu đề tự bỏ qua.
 */
export function parseStudentPaste(text: string): { rows: ParsedStudentRow[]; errors: string[] } {
  const rows: ParsedStudentRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  lines.forEach((line, idx) => {
    let cells = line.split("\t").map((c) => c.trim());
    if (cells.length === 1) cells = line.split(/[;,]/).map((c) => c.trim());
    if (/^\d+$/.test(cells[0]) && cells.length >= 3) cells = cells.slice(1);
    const first = normalizeVi(cells[0] || "");
    if (["lop", "ten lop", "stt"].includes(first)) return;

    const [className, name, dob, code] = cells;
    if (!className || !/^\d{1,2}/.test(className)) {
      errors.push(`Dòng ${idx + 1}: tên lớp "${className || ""}" phải bắt đầu bằng số khối (VD: 6A1)`);
      return;
    }
    if (!name || name.length < 2) {
      errors.push(`Dòng ${idx + 1}: thiếu họ tên`);
      return;
    }
    rows.push({ className: className.toUpperCase().replace(/\s+/g, ""), name, dob: dob || null, code: code || null });
  });
  return { rows, errors };
}
