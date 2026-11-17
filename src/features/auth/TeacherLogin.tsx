"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/client";
import { normalizeVi } from "@/lib/names";
import { ErrorBox, Spinner } from "@/components/ui";
import { PinForm } from "./PinForm";

type TeacherItem = { id: string; name: string };

export function TeacherLogin({ onDone }: { onDone: () => void }) {
  const [teachers, setTeachers] = useState<TeacherItem[] | null>(null);
  const [selected, setSelected] = useState<TeacherItem | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ teachers: TeacherItem[] }>("/api/public/teachers")
      .then(({ teachers }) => setTeachers(teachers))
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeVi(query);
    return (teachers || []).filter((t) => !q || normalizeVi(t.name).includes(q));
  }, [teachers, query]);

  if (error) return <ErrorBox message={error} />;
  if (!teachers) return <Spinner />;
  if (teachers.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">Chưa có tài khoản giáo viên. Hãy chạy lệnh tạo admin (npm run db:seed).</p>;
  }

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="mb-3 text-sm font-medium text-slate-600">
          ← Chọn người khác
        </button>
        <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-lg font-bold">{selected.name}</div>
        <PinForm endpoint="/api/auth/teacher-login" accountId={selected.id} onDone={onDone} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm tên giáo viên..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </div>
      <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {filtered.map((t) => (
          <li key={t.id}>
            <button onClick={() => setSelected(t)} className="w-full px-4 py-3 text-left font-medium hover:bg-slate-50">
              {t.name}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Không tìm thấy</li>}
      </ul>
    </div>
  );
}
