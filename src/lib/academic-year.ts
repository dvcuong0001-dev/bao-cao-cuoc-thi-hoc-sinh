/** Năm học chuẩn ngành Giáo dục: từ tháng 9 năm trước đến hết tháng 8 năm sau. Ví dụ "2026-2027". */
export function getAcademicYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  return date.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function nextAcademicYear(year: string): string {
  const start = parseInt(year.slice(0, 4), 10);
  return `${start + 1}-${start + 2}`;
}

/** Lấy khối từ tên lớp: "6A1" -> 6, "10C2" -> 10. Trả về null nếu không đọc được. */
export function parseGrade(className: string): number | null {
  const m = className.trim().match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : null;
}

/** Tên lớp năm sau: "6A1" -> "7A1" */
export function promoteClassName(className: string): string {
  return className.trim().replace(/^(\d{1,2})/, (d) => String(parseInt(d, 10) + 1));
}
