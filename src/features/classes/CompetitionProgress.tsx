"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Copy, Grid3x3, List, Lock } from "lucide-react";
import { api, copyText } from "@/lib/client";
import { formatDateTime } from "@/lib/status";
import { ProgressBar, StatusBadge } from "@/components/ui";
import type { ClassReportDto, PinSlip } from "@/types";

/** Tiến độ của lớp với một cuộc thi: danh sách học sinh + ảnh thu nhỏ + sao chép danh sách chưa nộp */
export function CompetitionProgress({
  data,
  onChanged,
  onSlip,
}: {
  data: ClassReportDto;
  onChanged: () => void;
  onSlip: (s: PinSlip) => void;
}) {
  // Mặc định: cuộc thi đang mở có hạn gần nhất; nếu không có thì cuộc thi mới nhất
  const latest =
    data.competitions.find((c) => c.status === "ACTIVE" && new Date(c.deadline).getTime() > Date.now()) ||
    data.competitions[data.competitions.length - 1];
  const [compId, setCompId] = useState(latest.id);
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [copied, setCopied] = useState(false);
  const comp = data.competitions.find((c) => c.id === compId)!;

  const rows = useMemo(
    () => data.students.map((s) => ({ s, cell: data.cells[s.id]?.[compId] })).filter((r) => r.cell),
    [data, compId]
  );
  const done = rows.filter((r) => r.cell.status === "ON_TIME" || r.cell.status === "LATE");
  const notDone = rows.filter((r) => r.cell.status === "PENDING" || r.cell.status === "MISSING");

  const copyMissing = async () => {
    const text = `Lớp ${data.classRoom.name} - ${comp.title}\nCác em chưa nộp minh chứng (${notDone.length}):\n` +
      notDone.map((r, i) => `${i + 1}. ${r.s.name}`).join("\n");
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else alert(text);
  };

  const resetPin = async (id: string, unlockOnly: boolean) => {
    if (!unlockOnly && !confirm("Cấp lại PIN mới cho học sinh này?")) return;
    try {
      const res = await api<{ slip?: PinSlip }>(`/api/students/${id}/reset-pin`, { json: { unlockOnly } });
      if (res.slip) onSlip(res.slip);
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <select className="input" value={compId} onChange={(e) => setCompId(e.target.value)}>
        {[...data.competitions].reverse().map((c) => (
          <option key={c.id} value={c.id}>{c.title} (hạn {formatDateTime(c.deadline)})</option>
        ))}
      </select>

      <div className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>Đã nộp <b>{done.length}</b>/{rows.length} · Chưa nộp <b className="text-rose-600">{notDone.length}</b></span>
          <div className="flex gap-2">
            <button className="btn-ghost px-3 py-1.5" onClick={copyMissing} disabled={notDone.length === 0}>
              <Copy size={14} /> {copied ? "Đã sao chép" : "Sao chép DS chưa nộp"}
            </button>
            <button className="btn-ghost px-3 py-1.5" onClick={() => setMode(mode === "list" ? "grid" : "list")} title="Đổi kiểu xem">
              {mode === "list" ? <Grid3x3 size={14} /> : <List size={14} />}
            </button>
          </div>
        </div>
        <ProgressBar value={done.length} total={rows.length} />
        {comp.isArchived && <p className="mt-2 text-xs text-slate-500">Cuộc thi đã lưu trữ: ảnh minh chứng đã được dọn, chỉ còn lịch sử nộp.</p>}
      </div>

      {mode === "grid" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {done.map(({ s, cell }) => (
            <a key={s.id} href={cell.hasImage ? `/api/submissions/${cell.submissionId}/image` : undefined} target="_blank" rel="noopener noreferrer" className="card overflow-hidden">
              {cell.hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/submissions/${cell.submissionId}/image?size=thumb`} alt={s.name} loading="lazy" className="aspect-square w-full bg-slate-100 object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-400">Không có ảnh</div>
              )}
              <div className={clsx("truncate px-2 py-1 text-xs", cell.status === "LATE" && "text-amber-700")}>{s.name}</div>
            </a>
          ))}
        </div>
      ) : (
        <ul className="card divide-y divide-slate-100">
          {rows.map(({ s, cell }, i) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-6 text-right text-xs text-slate-400">{i + 1}</span>
              {cell.hasImage ? (
                <a href={`/api/submissions/${cell.submissionId}/image`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/submissions/${cell.submissionId}/image?size=thumb`} alt="" loading="lazy" className="h-10 w-10 rounded-lg bg-slate-100 object-cover" />
                </a>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {s.name} {!s.isActive && <span className="text-xs text-slate-400">(đã chuyển/nghỉ)</span>}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {cell.submittedAt ? formatDateTime(cell.submittedAt) : ""}{cell.note ? ` · ${cell.note}` : ""}
                </div>
              </div>
              {s.lockedMinutes > 0 && data.access === "manage" && (
                <button className="text-xs font-semibold text-amber-700 underline" onClick={() => resetPin(s.id, true)}>
                  <Lock size={12} className="inline" /> Mở khoá
                </button>
              )}
              <StatusBadge status={cell.status} />
              {data.access === "manage" && s.isActive && (
                <button className="text-xs text-slate-500 underline" onClick={() => resetPin(s.id, false)}>PIN</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
