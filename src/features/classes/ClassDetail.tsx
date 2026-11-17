"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, Download, KeyRound } from "lucide-react";
import { api } from "@/lib/client";
import { ErrorBox, Spinner, Empty } from "@/components/ui";
import type { ClassReportDto, PinSlip } from "@/types";
import { CompetitionProgress } from "./CompetitionProgress";
import { ClassMatrix } from "./ClassMatrix";
import { PinSlipsModal } from "@/features/pins/PinSlipsModal";
import { exportClassReport } from "@/features/reports/exportExcel";

export function ClassDetail({ classId, onBack }: { classId: string; onBack: () => void }) {
  const [data, setData] = useState<ClassReportDto | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"competition" | "matrix">("competition");
  const [slips, setSlips] = useState<PinSlip[] | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ClassReportDto>(`/api/reports/class/${classId}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAll = async () => {
    if (!confirm("Cấp lại PIN cho các học sinh CHƯA đổi PIN trong lớp? PIN cũ của các em đó sẽ không dùng được nữa.")) return;
    try {
      const { slips } = await api<{ slips: PinSlip[] }>(`/api/classes/${classId}/reset-pins`, { json: { onlyNotChanged: true } });
      if (slips.length === 0) alert("Tất cả học sinh đã tự đổi PIN, không cần cấp lại.");
      else setSlips(slips);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
          <ChevronLeft size={16} /> Danh sách lớp
        </button>
        {data && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => exportClassReport(data)}>
              <Download size={16} /> Xuất Excel
            </button>
            {data.access === "manage" && (
              <button className="btn-ghost" onClick={resetAll}>
                <KeyRound size={16} /> In phiếu PIN
              </button>
            )}
          </div>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <h1 className="mb-3 text-xl font-bold text-slate-900">
            Lớp {data.classRoom.name} <span className="text-sm font-normal text-slate-500">· {data.classRoom.academicYear} · {data.students.length} học sinh</span>
          </h1>
          <div className="mb-3 inline-flex rounded-xl bg-slate-200/70 p-1">
            {(["competition", "matrix"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx("rounded-lg px-3 py-1.5 text-sm font-semibold", view === v ? "bg-white shadow-sm" : "text-slate-600")}
              >
                {v === "competition" ? "Theo cuộc thi" : "Ma trận cả năm"}
              </button>
            ))}
          </div>
          {data.competitions.length === 0 ? (
            <Empty>Lớp chưa được giao cuộc thi nào.</Empty>
          ) : view === "competition" ? (
            <CompetitionProgress data={data} onChanged={load} onSlip={(s) => setSlips([s])} />
          ) : (
            <ClassMatrix data={data} />
          )}
        </>
      )}
      {slips && <PinSlipsModal slips={slips} onClose={() => setSlips(null)} />}
    </div>
  );
}
