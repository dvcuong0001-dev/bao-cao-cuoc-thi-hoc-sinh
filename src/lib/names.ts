/** Sắp xếp theo tên (chữ cuối) rồi đến họ đệm, như sổ điểm Việt Nam */
export function compareVietnameseName(a: string, b: string): number {
  const la = lastWord(a);
  const lb = lastWord(b);
  return la.localeCompare(lb, "vi") || a.localeCompare(b, "vi");
}

function lastWord(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

/** Bỏ dấu tiếng Việt để tìm kiếm */
export function normalizeVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
