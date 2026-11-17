"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Pencil, Plus, Square, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/status";
import { Empty, ErrorBox, Spinner } from "@/components/ui";
import type { ClassDto, CompetitionDto } from "@/types";
import { CompetitionFormModal } from "./CompetitionFormModal";
import { useYears } from "@/features/reports/useYears";

export function CompetitionsTab() {
  const { years, current } = useYears();
  const [year, setYear] = useState("");
  const [items, setItems] = useState<CompetitionDto[] | null>(null);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CompetitionDto | null | "new">(null);

  const y = year || current;
  const load = useCallback(async () => {
    if (!y) return;
    setError("");
    try {
      const [c, cl] = await Promise.all([
        api<{ competitions: CompetitionDto[] }>(`/api/competitions?year=${y}`),
        api<{ classes: ClassDto[] }>("/api/classes"),
      ]);
      setItems(c.competitions);
      setClasses(cl.classes);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [y]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (msg: string, fn: () => Promise<unknown>) => {
    if (!confirm(msg)) return;
    try {
      await fn();
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select className="input w-auto" value={y} onChange={(e) => setYear(e.target.value)}>
          {years.map((x) => <option key={x} value={x}>Năm học {x}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setEditing("new")} disabled={classes.length === 0}>
          <Plus size={16} /> Tạo cuộc thi
        </button>
      </div>
      {classes.length === 0 && items && <Empty>Chưa có lớp nào. Hãy vào mục &quot;Lớp &amp; học sinh&quot; để nhập danh sách trước.</Empty>}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && classes.length > 0 && <Empty>Chưa có cuộc thi nào trong năm học này.</Empty>}

      <div className="space-y-2">
        {items?.map((c) => {
          const past = new Date(c.deadline).getTime() < Date.now();
          return (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{c.title}</h3>
                  <p className="text-xs text-slate-500">
                    Hạn {formatDateTime(c.deadline)} · {c.classNames.length} lớp
                    {c.status === "CLOSED_EARLY" && <b className="text-rose-600"> · Đã kết thúc</b>}
                    {c.isArchived && <b className="text-slate-600"> · Đã lưu trữ</b>}
                    {!c.allowLateSubmission && " · Không nhận nộp muộn"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{c.classNames.join(", ")}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!c.isArchived && (
                    <button className="btn-ghost px-3 py-1.5" onClick={() => setEditing(c)}><Pencil size={14} /> Sửa</button>
                  )}
                  {c.status === "ACTIVE" && !c.isArchived && (
                    <button className="btn-ghost px-3 py-1.5" onClick={() => act("Kết thúc sớm cuộc thi? Học sinh sẽ không nộp được nữa.", () => api(`/api/competitions/${c.id}`, { method: "PATCH", json: { status: "CLOSED_EARLY" } }))}>
                      <Square size={14} /> Kết thúc
                    </button>
                  )}
                  {past && !c.isArchived && (
                    <button className="btn-ghost px-3 py-1.5" onClick={() => act("Lưu trữ sẽ XOÁ toàn bộ ảnh minh chứng của cuộc thi này (giữ lại lịch sử nộp). Nên xuất Excel trước. Tiếp tục?", () => api(`/api/competitions/${c.id}/archive`, { method: "POST" }))}>
                      <Archive size={14} /> Lưu trữ
                    </button>
                  )}
                  <button className="btn-ghost px-3 py-1.5 text-rose-600" onClick={() => act(`XOÁ HẲN cuộc thi "${c.title}" cùng toàn bộ bài nộp và ảnh? Không thể khôi phục.`, () => api(`/api/competitions/${c.id}`, { method: "DELETE" }))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <CompetitionFormModal
          initial={editing === "new" ? null : editing}
          classes={classes}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
