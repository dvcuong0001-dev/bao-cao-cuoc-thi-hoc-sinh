"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/client";
import { normalizeVi } from "@/lib/names";
import { Modal } from "@/components/Modal";
import { ErrorBox, Notice, Spinner } from "@/components/ui";
import type { ClassDto, TeacherDto, ViewerRole } from "@/types";

/** Phân quyền xem lớp: mỗi lớp có thể có 1 hoặc nhiều người (GVCN được reset PIN, người xem chỉ xem) */
export function ViewersModal({ classRoom, onClose, onSaved }: { classRoom: ClassDto; onClose: () => void; onSaved: () => void }) {
  const [teachers, setTeachers] = useState<TeacherDto[] | null>(null);
  const [roles, setRoles] = useState<Record<string, ViewerRole>>(
    Object.fromEntries(classRoom.viewers.map((v) => [v.teacherId, v.role]))
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ teachers: TeacherDto[] }>("/api/teachers")
      .then(({ teachers }) => setTeachers(teachers.filter((t) => t.isActive)))
      .catch((e) => setError(e.message));
  }, []);

  const list = useMemo(() => {
    const q = normalizeVi(query);
    return (teachers || [])
      .filter((t) => !q || normalizeVi(t.name).includes(q))
      .sort((a, b) => Number(Boolean(roles[b.id])) - Number(Boolean(roles[a.id])));
  }, [teachers, query, roles]);

  const setRole = (id: string, role: ViewerRole | null) =>
    setRoles((r) => {
      const next = { ...r };
      if (role) next[id] = role;
      else delete next[id];
      return next;
    });

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/classes/${classRoom.id}/viewers`, {
        method: "PUT",
        json: { viewers: Object.entries(roles).map(([teacherId, role]) => ({ teacherId, role })) },
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Phân quyền xem lớp ${classRoom.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Huỷ</button>
          <button className="btn-primary" onClick={save} disabled={busy}>Lưu ({Object.keys(roles).length} người)</button>
        </>
      }
    >
      <div className="space-y-3">
        <Notice><b>GVCN</b>: xem tiến độ, xem ảnh, cấp lại PIN cho học sinh. <b>Xem</b>: chỉ xem tiến độ và ảnh.</Notice>
        <input className="input" placeholder="Tìm giáo viên..." value={query} onChange={(e) => setQuery(e.target.value)} />
        {error && <ErrorBox message={error} />}
        {!teachers && !error && <Spinner />}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {list.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm font-medium">{t.name}</span>
              <div className="flex gap-1">
                {([null, "HOMEROOM", "VIEWER"] as const).map((r) => (
                  <button
                    key={r ?? "none"}
                    onClick={() => setRole(t.id, r)}
                    className={clsx(
                      "rounded-lg px-2 py-1 text-xs font-semibold",
                      (roles[t.id] ?? null) === r ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {r === null ? "Không" : r === "HOMEROOM" ? "GVCN" : "Xem"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
