import type { CellStatus } from "@/types";

/** Dùng chung cho cả server và trình duyệt */
export function cellStatus(
  submission: { status: string } | null | undefined,
  competition: { deadline: string | Date; status: string }
): CellStatus {
  if (submission) return submission.status === "LATE" ? "LATE" : "ON_TIME";
  const closed = competition.status === "CLOSED_EARLY" || new Date(competition.deadline).getTime() < Date.now();
  return closed ? "MISSING" : "PENDING";
}

export const STATUS_LABEL: Record<CellStatus, string> = {
  ON_TIME: "Đã nộp",
  LATE: "Nộp muộn",
  PENDING: "Chưa nộp",
  MISSING: "Không nộp",
  NOT_ASSIGNED: "Không giao",
};

export const STATUS_CLASS: Record<CellStatus, string> = {
  ON_TIME: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LATE: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING: "bg-sky-50 text-sky-700 border-sky-200",
  MISSING: "bg-rose-100 text-rose-800 border-rose-200",
  NOT_ASSIGNED: "bg-slate-100 text-slate-400 border-slate-200",
};

export function formatDateTime(v: string | Date) {
  const d = new Date(v);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDate(v: string | Date | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}
