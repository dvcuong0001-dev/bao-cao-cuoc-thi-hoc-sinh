"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/client";
import { Modal } from "@/components/Modal";
import { ErrorBox, Notice, Spinner } from "@/components/ui";
import { PinSlipsModal } from "@/features/pins/PinSlipsModal";
import type { PinSlip, TeacherDto } from "@/types";

const ROLE_LABEL = { SUPER_ADMIN: "Tổng quản trị", ADMIN: "Quản trị viên", TEACHER: "Giáo viên" } as const;

export function TeachersTab({ isSuperAdmin, meId }: { isSuperAdmin: boolean; meId: string }) {
  const [teachers, setTeachers] = useState<TeacherDto[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [names, setNames] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [slips, setSlips] = useState<PinSlip[] | null>(null);

  const load = useCallback(async () => {
    try {
      setTeachers((await api<{ teachers: TeacherDto[] }>("/api/teachers")).teachers);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const add = () =>
    run(async () => {
      const list = names.split(/\r?\n/).map((n) => n.trim()).filter((n) => n.length >= 2);
      const { slips } = await api<{ slips: PinSlip[] }>("/api/teachers", { json: { names: list, role: asAdmin ? "ADMIN" : "TEACHER" } });
      setAdding(false);
      setNames("");
      setSlips(slips);
    });

  const resetPin = (t: TeacherDto) =>
    confirm(`Cấp lại PIN cho ${t.name}?`) &&
    run(async () => {
      const { slip } = await api<{ slip: PinSlip }>(`/api/teachers/${t.id}`, { method: "POST" });
      setSlips([slip]);
    });

  const rename = (t: TeacherDto) => {
    const name = prompt("Họ và tên:", t.name)?.trim();
    if (name && name !== t.name) run(() => api(`/api/teachers/${t.id}`, { method: "PATCH", json: { name } }));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Thêm giáo viên</button>
      </div>
      {error && <ErrorBox message={error} />}
      {!teachers && !error && <Spinner />}
      {teachers && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Họ tên</th>
                <th className="px-3 py-2 text-left">Vai trò</th>
                <th className="px-3 py-2 text-left">Lớp được xem</th>
                <th className="px-3 py-2 text-left">PIN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className={t.isActive ? "border-t border-slate-100" : "border-t border-slate-100 text-slate-400"}>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-xs">
                    {isSuperAdmin && t.role !== "SUPER_ADMIN" ? (
                      <select
                        className="rounded-lg border border-slate-200 px-1 py-1"
                        value={t.role}
                        onChange={(e) => run(() => api(`/api/teachers/${t.id}`, { method: "PATCH", json: { role: e.target.value } }))}
                      >
                        <option value="TEACHER">Giáo viên</option>
                        <option value="ADMIN">Quản trị viên</option>
                      </select>
                    ) : (
                      ROLE_LABEL[t.role]
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {t.classes.map((c) => `${c.className}${c.role === "HOMEROOM" ? " (CN)" : ""}`).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{t.lockedMinutes ? `Bị khoá ${t.lockedMinutes}p` : t.mustChangePin ? "Chưa đổi" : "Đã đổi"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="p-1.5 text-slate-500" title="Sửa tên" onClick={() => rename(t)}><Pencil size={14} /></button>
                    <button className="p-1.5 text-slate-500" title="Cấp lại PIN" onClick={() => resetPin(t)}><KeyRound size={14} /></button>
                    {t.role !== "SUPER_ADMIN" && t.id !== meId && (
                      <button
                        className="px-1.5 text-xs text-slate-500 underline"
                        onClick={() => run(() => api(`/api/teachers/${t.id}`, { method: "PATCH", json: { isActive: !t.isActive } }))}
                      >
                        {t.isActive ? "Khoá" : "Mở"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <Modal
          title="Thêm giáo viên"
          onClose={() => setAdding(false)}
          footer={<button className="btn-primary" onClick={add} disabled={!names.trim()}>Tạo tài khoản</button>}
        >
          <div className="space-y-3">
            <Notice>Mỗi dòng một họ tên (có thể dán cả cột tên từ Excel). Hệ thống tạo PIN ngẫu nhiên để in phiếu.</Notice>
            <textarea className="input min-h-[160px]" value={names} onChange={(e) => setNames(e.target.value)} />
            {isSuperAdmin && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={asAdmin} onChange={(e) => setAsAdmin(e.target.checked)} /> Tạo với quyền quản trị viên
              </label>
            )}
          </div>
        </Modal>
      )}
      {slips && <PinSlipsModal slips={slips} onClose={() => setSlips(null)} />}
    </div>
  );
}
