"use client";

import clsx from "clsx";
import { STATUS_LABEL, formatDate } from "@/lib/status";
import type { CellStatus, ClassReportDto } from "@/types";

const DOT: Record<CellStatus, string> = {
  ON_TIME: "bg-emerald-500",
  LATE: "bg-amber-400",
  PENDING: "bg-sky-200",
  MISSING: "bg-rose-500",
  NOT_ASSIGNED: "bg-slate-200",
};

/** Ma trận học sinh (hàng) x cuộc thi (cột), cố định cột tên khi cuộn ngang */
export function ClassMatrix({ data }: { data: ClassReportDto }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {(["ON_TIME", "LATE", "PENDING", "MISSING"] as CellStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className={clsx("h-3 w-3 rounded-full", DOT[s])} /> {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-600">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Học sinh</th>
              {data.competitions.map((c) => (
                <th key={c.id} className="min-w-[90px] px-2 py-2 text-center font-medium" title={c.title}>
                  <div className="line-clamp-2">{c.title}</div>
                  <div className="font-normal text-slate-400">{formatDate(c.deadline)}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-center">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => {
              const cells = data.competitions.map((c) => data.cells[s.id]?.[c.id]);
              const done = cells.filter((x) => x && (x.status === "ON_TIME" || x.status === "LATE")).length;
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-medium">{s.name}</td>
                  {cells.map((cell, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      <span
                        className={clsx("inline-block h-4 w-4 rounded-full", DOT[cell?.status || "NOT_ASSIGNED"])}
                        title={`${STATUS_LABEL[cell?.status || "NOT_ASSIGNED"]}${cell?.submittedAt ? " - " + new Date(cell.submittedAt).toLocaleString("vi-VN") : ""}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center text-xs font-semibold">{done}/{cells.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
