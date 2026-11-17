"use client";

import * as XLSX from "xlsx";
import { STATUS_LABEL, formatDate } from "@/lib/status";
import type { ClassReportDto, SchoolReportDto } from "@/types";

function save(wb: XLSX.WorkBook, name: string) {
  XLSX.writeFile(wb, `${name.replace(/[\\/:*?"<>|]/g, "_")}.xlsx`);
}

/** Excel của 1 lớp: sheet ma trận + sheet danh sách chưa nộp */
export function exportClassReport(data: ClassReportDto) {
  const header = ["STT", "Họ và tên", "Ngày sinh", ...data.competitions.map((c) => c.title), "Đã nộp"];
  const rows = data.students.map((s, i) => {
    const cells = data.competitions.map((c) => data.cells[s.id]?.[c.id]?.status || "NOT_ASSIGNED");
    const done = cells.filter((x) => x === "ON_TIME" || x === "LATE").length;
    return [i + 1, s.name, formatDate(s.dob), ...cells.map((x) => STATUS_LABEL[x]), `${done}/${cells.length}`];
  });
  const matrix = XLSX.utils.aoa_to_sheet([header, ...rows]);
  matrix["!cols"] = [{ wch: 5 }, { wch: 26 }, { wch: 12 }, ...data.competitions.map(() => ({ wch: 14 })), { wch: 8 }];

  const missingRows: (string | number)[][] = [["Cuộc thi", "Hạn chót", "STT", "Học sinh chưa nộp"]];
  for (const c of data.competitions) {
    const list = data.students.filter((s) => {
      const st = data.cells[s.id]?.[c.id]?.status;
      return st === "PENDING" || st === "MISSING";
    });
    list.forEach((s, i) => missingRows.push([c.title, formatDate(c.deadline), i + 1, s.name]));
  }
  const missing = XLSX.utils.aoa_to_sheet(missingRows);
  missing["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 5 }, { wch: 26 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, matrix, "Ma trận");
  XLSX.utils.book_append_sheet(wb, missing, "Chưa nộp");
  save(wb, `Bao cao lop ${data.classRoom.name} ${data.classRoom.academicYear}`);
}

/** Excel báo cáo toàn trường theo lớp */
export function exportSchoolReport(data: SchoolReportDto, title: string) {
  const header = ["Khối", "Lớp", "Sĩ số", "Lượt được giao", "Đúng hạn", "Nộp muộn", "Chưa nộp", "Tỷ lệ %"];
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const rows = data.rows.map((r) => [
    r.grade,
    r.className,
    r.studentCount,
    r.assigned,
    r.onTime,
    r.late,
    r.missing,
    pct(r.onTime + r.late, r.assigned),
  ]);
  const t = data.rows.reduce(
    (a, r) => ({ s: a.s + r.studentCount, as: a.as + r.assigned, o: a.o + r.onTime, l: a.l + r.late, m: a.m + r.missing }),
    { s: 0, as: 0, o: 0, l: 0, m: 0 }
  );
  rows.push(["", "TỔNG", t.s, t.as, t.o, t.l, t.m, pct(t.o + t.l, t.as)]);
  const sheet = XLSX.utils.aoa_to_sheet([[title], [], header, ...rows]);
  sheet["!cols"] = [{ wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 9 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Theo lớp");
  save(wb, `Bao cao toan truong ${data.academicYear}`);
}
