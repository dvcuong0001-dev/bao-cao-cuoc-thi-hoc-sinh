"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/status";
import { Modal } from "@/components/Modal";
import { ErrorBox, Spinner } from "@/components/ui";
import { PinSlipsModal } from "@/features/pins/PinSlipsModal";
import type { ClassDto, PinSlip, StudentRowDto } from "@/types";

export function StudentsAdminModal({ classRoom, classes, onClose }: { classRoom: ClassDto; classes: ClassDto[]; onClose: () => void }) {
  const [students, setStudents] = useState<StudentRowDto[] | null>(null);
  const [error, setError] = useState("");
  const [slips, setSlips] = useState<PinSlip[] | null>(null);

  const load = useCallback(async () => {
    try {
      setStudents((await api<{ students: StudentRowDto[] }>(`/api/classes/${classRoom.id}/students?all=1`)).students);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classRoom.id]);

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

  const edit = (s: StudentRowDto) => {
    const name = prompt("Họ và tên:", s.name)?.trim();
    if (!name) return;
    const dob = prompt("Ngày sinh (dd/mm/yyyy, để trống nếu không có):", s.dob ? formatDate(s.dob) : "") ?? "";
    run(() => api(`/api/students/${s.id}`, { method: "PATCH", json: { name, dob: dob.trim() || null } }));
  };

  const move = (s: StudentRowDto, classId: string) => {
    const target = classes.find((c) => c.id === classId);
    if (target && confirm(`Chuyển ${s.name} sang lớp ${target.name}?`)) {
      run(() => api(`/api/students/${s.id}`, { method: "PATCH", json: { classId } }));
    }
  };

  const resetPin = (s: StudentRowDto) =>
    run(async () => {
      const { slip } = await api<{ slip: PinSlip }>(`/api/students/${s.id}/reset-pin`, { json: {} });
      setSlips([slip]);
    });

  const addOne = () => {
    const name = prompt("Họ và tên học sinh mới:")?.trim();
    if (!name) return;
    const dob = prompt("Ngày sinh (dd/mm/yyyy, có thể bỏ trống):")?.trim() || null;
    run(async () => {
      const res = await api<{ created: PinSlip[]; skipped: { reason: string }[] }>("/api/students/import", {
        json: { academicYear: classRoom.academicYear, rows: [{ className: classRoom.name, name, dob }] },
      });
      if (res.created.length) setSlips(res.created);
      else alert(res.skipped[0]?.reason || "Không thêm được");
    });
  };

  if (slips) return <PinSlipsModal slips={slips} onClose={() => setSlips(null)} />;

  return (
    <Modal title={`Học sinh lớp ${classRoom.name}`} onClose={onClose} wide footer={<button className="btn-primary" onClick={addOne}>Thêm 1 học sinh</button>}>
      {error && <ErrorBox message={error} />}
      {!students && !error && <Spinner />}
      {students && (
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1 text-left">Họ tên</th>
              <th className="py-1 text-left">Ngày sinh</th>
              <th className="py-1 text-left">Trạng thái</th>
              <th className="py-1 text-left">Chuyển lớp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className={s.isActive ? "border-t border-slate-100" : "border-t border-slate-100 text-slate-400"}>
                <td className="py-1.5 font-medium">{s.name}</td>
                <td className="py-1.5">{formatDate(s.dob)}</td>
                <td className="py-1.5 text-xs">
                  {!s.isActive ? "Ngừng hoạt động" : s.lockedMinutes ? `Bị khoá ${s.lockedMinutes}p` : s.mustChangePin ? "Chưa đổi PIN" : "Đã đổi PIN"}
                </td>
                <td className="py-1.5">
                  <select className="rounded-lg border border-slate-200 px-1 py-1 text-xs" value={classRoom.id} onChange={(e) => move(s, e.target.value)}>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="whitespace-nowrap py-1.5 text-right">
                  <button className="p-1.5 text-slate-500" title="Sửa" onClick={() => edit(s)}><Pencil size={14} /></button>
                  <button className="p-1.5 text-slate-500" title="Cấp lại PIN" onClick={() => resetPin(s)}><KeyRound size={14} /></button>
                  <button
                    className="px-1.5 text-xs text-slate-500 underline"
                    onClick={() => run(() => api(`/api/students/${s.id}`, { method: "PATCH", json: { isActive: !s.isActive } }))}
                  >
                    {s.isActive ? "Ngừng" : "Kích hoạt"}
                  </button>
                  <button
                    className="p-1.5 text-rose-500"
                    title="Xoá"
                    onClick={() => confirm(`Xoá hẳn ${s.name}?`) && run(() => api(`/api/students/${s.id}`, { method: "DELETE" }))}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
