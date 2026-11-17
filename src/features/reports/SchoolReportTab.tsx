"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/status";
import { Empty, ErrorBox, ProgressBar, Spinner } from "@/components/ui";
import type { SchoolReportDto } from "@/types";
import { exportSchoolReport } from "./exportExcel";
import { useYears } from "./useYears";

/** Báo cáo theo lớp (admin: toàn trường; giáo viên: các lớp mình được xem) */
export function SchoolReportTab() {
  const { years, current } = useYears();
  const [year, setYear] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [grade, setGrade] = useState<number | "">("");
  const [data, setData] = useState<SchoolReportDto | null>(null);
  const [error, setError] = useState("");

  const y = year || current;
  const load = useCallback(async () => {
    if (!y) return;
    setError("");
    setData(null);
    try {
      const qs = new URLSearchParams({ year: y, ...(competitionId ? { competitionId } : {}) });
      setData(await api<SchoolReportDto>(`/api/reports/school?${qs}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [y, competitionId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => (data?.rows || []).filter((r) => grade === "" || r.grade === grade), [data, grade]);
  const grades = useMemo(() => Array.from(new Set((data?.rows || []).map((r) => r.grade))), [data]);
  const total = rows.reduce(
    (a, r) => ({ assigned: a.assigned + r.assigned, done: a.done + r.onTime + r.late, late: a.late + r.late, missing: a.missing + r.missing }),
    { assigned: 0, done: 0, late: 0, missing: 0 }
  );
  const compTitle = data?.competitions.find((c) => c.id === competitionId)?.title || "Tất cả cuộc thi";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <select className="input" value={y} onChange={(e) => { setYear(e.target.value); setCompetitionId(""); }}>
          {years.map((x) => <option key={x} value={x}>Năm học {x}</option>)}
        </select>
        <select className="input sm:col-span-2" value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
          <option value="">Tất cả cuộc thi trong năm</option>
          {data?.competitions.map((c) => <option key={c.id} value={c.id}>{c.title} (hạn {formatDate(c.deadline)})</option>)}
        </select>
        <select className="input" value={grade} onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Tất cả khối</option>
          {grades.map((g) => <option key={g} value={g}>Khối {g}</option>)}
        </select>
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner />}
      {data && rows.length === 0 && <Empty>Chưa có dữ liệu cho năm học này.</Empty>}
      {data && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Lượt được giao" value={total.assigned} />
            <Kpi label="Đã nộp" value={total.done} />
            <Kpi label="Nộp muộn" value={total.late} />
            <Kpi label="Chưa nộp" value={total.missing} danger />
          </div>
          <div className="flex justify-end">
            <button className="btn-ghost" onClick={() => exportSchoolReport({ ...data, rows }, `Báo cáo ${compTitle} - năm học ${data.academicYear}`)}>
              <Download size={16} /> Xuất Excel
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Lớp</th>
                  <th className="px-3 py-2 text-right">Sĩ số</th>
                  <th className="px-3 py-2 text-right">Đã nộp</th>
                  <th className="px-3 py-2 text-right">Muộn</th>
                  <th className="px-3 py-2 text-right">Chưa nộp</th>
                  <th className="w-48 px-3 py-2">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.classId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold">{r.className}</td>
                    <td className="px-3 py-2 text-right">{r.studentCount}</td>
                    <td className="px-3 py-2 text-right">{r.onTime + r.late}/{r.assigned}</td>
                    <td className="px-3 py-2 text-right text-amber-700">{r.late}</td>
                    <td className="px-3 py-2 text-right text-rose-600">{r.missing}</td>
                    <td className="px-3 py-2"><ProgressBar value={r.onTime + r.late} total={r.assigned} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={danger ? "text-2xl font-bold text-rose-600" : "text-2xl font-bold text-slate-900"}>{value.toLocaleString("vi-VN")}</div>
    </div>
  );
}
