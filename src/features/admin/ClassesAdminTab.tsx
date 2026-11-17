"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Plus, Trash2, UserCog, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Empty, ErrorBox, Spinner } from "@/components/ui";
import type { ClassDto } from "@/types";
import { ImportStudentsModal } from "./ImportStudentsModal";
import { ViewersModal } from "./ViewersModal";
import { StudentsAdminModal } from "./StudentsAdminModal";

export function ClassesAdminTab() {
  const [classes, setClasses] = useState<ClassDto[] | null>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [viewersOf, setViewersOf] = useState<ClassDto | null>(null);
  const [studentsOf, setStudentsOf] = useState<ClassDto | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setClasses((await api<{ classes: ClassDto[] }>("/api/classes")).classes);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addClass = async () => {
    const name = prompt("Tên lớp (ví dụ 6A1):")?.trim().toUpperCase();
    if (!name) return;
    try {
      await api("/api/classes", { json: { name } });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const removeClass = async (c: ClassDto) => {
    if (!confirm(`Xoá lớp ${c.name}? (chỉ xoá được lớp chưa có học sinh)`)) return;
    try {
      await api(`/api/classes/${c.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn-ghost" onClick={addClass}><Plus size={16} /> Thêm lớp</button>
        <button className="btn-primary" onClick={() => setImporting(true)}><FileSpreadsheet size={16} /> Nhập học sinh từ Excel</button>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!classes && !error && <Spinner />}
      {classes && classes.length === 0 && <Empty>Chưa có lớp nào. Bấm &quot;Nhập học sinh từ Excel&quot;, lớp sẽ được tạo tự động.</Empty>}
      {classes && classes.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Lớp</th>
                <th className="px-3 py-2 text-right">Sĩ số</th>
                <th className="px-3 py-2 text-left">GVCN / người xem</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{c.name}</td>
                  <td className="px-3 py-2 text-right">{c.studentCount}</td>
                  <td className="px-3 py-2 text-xs">
                    {c.viewers.length === 0 && <span className="text-rose-600">Chưa phân quyền</span>}
                    {c.viewers.map((v) => (
                      <span key={v.teacherId} className="mr-2 inline-block">
                        {v.name}
                        <span className="text-slate-400">{v.role === "HOMEROOM" ? " (GVCN)" : " (xem)"}</span>
                      </span>
                    ))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="btn-ghost mr-1 px-2.5 py-1" onClick={() => setViewersOf(c)} title="Phân quyền xem"><UserCog size={14} /></button>
                    <button className="btn-ghost mr-1 px-2.5 py-1" onClick={() => setStudentsOf(c)} title="Học sinh"><Users size={14} /></button>
                    <button className="btn-ghost px-2.5 py-1 text-rose-600" onClick={() => removeClass(c)} title="Xoá lớp"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importing && <ImportStudentsModal onClose={() => { setImporting(false); load(); }} />}
      {viewersOf && <ViewersModal classRoom={viewersOf} onClose={() => setViewersOf(null)} onSaved={() => { setViewersOf(null); load(); }} />}
      {studentsOf && classes && <StudentsAdminModal classRoom={studentsOf} classes={classes} onClose={() => { setStudentsOf(null); load(); }} />}
    </div>
  );
}
