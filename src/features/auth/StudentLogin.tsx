"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, Search } from "lucide-react";
import { api, storageGet, storageSet } from "@/lib/client";
import { normalizeVi } from "@/lib/names";
import { ErrorBox, Spinner } from "@/components/ui";
import { PinForm } from "./PinForm";

type ClassItem = { id: string; name: string; grade: number };
type StudentItem = { id: string; name: string; hint: string | null };

/** Bước 1: chọn lớp → Bước 2: chọn tên → Bước 3: nhập PIN */
export function StudentLogin({ onDone }: { onDone: () => void }) {
  const [classes, setClasses] = useState<ClassItem[] | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentItem[] | null>(null);
  const [student, setStudent] = useState<StudentItem | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ classes: ClassItem[] }>("/api/public/classes")
      .then(({ classes }) => {
        setClasses(classes);
        const last = classes.find((c) => c.id === storageGet("last-class"));
        setGrade(last?.grade ?? classes[0]?.grade ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!cls) return;
    setStudents(null);
    api<{ students: StudentItem[] }>(`/api/public/classes/${cls.id}/students`)
      .then(({ students }) => setStudents(students))
      .catch((e) => setError(e.message));
  }, [cls]);

  const grades = useMemo(() => Array.from(new Set((classes || []).map((c) => c.grade))), [classes]);
  const filtered = useMemo(() => {
    const q = normalizeVi(query);
    return (students || []).filter((s) => !q || normalizeVi(s.name).includes(q));
  }, [students, query]);

  if (error) return <ErrorBox message={error} onRetry={() => window.location.reload()} />;
  if (!classes) return <Spinner />;
  if (classes.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Chưa có lớp nào được tạo.</p>;

  if (student && cls) {
    return (
      <div>
        <BackButton onClick={() => setStudent(null)} />
        <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3">
          <div className="text-xs text-slate-500">Lớp {cls.name}</div>
          <div className="text-lg font-bold text-slate-900">{student.name}</div>
        </div>
        <PinForm endpoint="/api/auth/student-login" accountId={student.id} onDone={onDone} />
      </div>
    );
  }

  if (cls) {
    return (
      <div>
        <BackButton onClick={() => { setCls(null); setQuery(""); }} />
        <h2 className="mb-2 font-bold text-slate-900">Lớp {cls.name}: chọn tên của em</h2>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-9" placeholder="Tìm tên..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {!students ? (
          <Spinner />
        ) : (
          <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {filtered.map((s) => (
              <li key={s.id}>
                <button onClick={() => setStudent(s)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                  <span className="font-medium">{s.name}</span>
                  {s.hint && <span className="text-xs text-slate-500">Sinh {s.hint}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Không tìm thấy</li>}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 font-bold text-slate-900">Chọn lớp của em</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {grades.map((g) => (
          <button
            key={g}
            onClick={() => setGrade(g)}
            className={clsx("rounded-full px-4 py-1.5 text-sm font-semibold", grade === g ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700")}
          >
            Khối {g}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {classes
          .filter((c) => c.grade === grade)
          .map((c) => (
            <button
              key={c.id}
              onClick={() => { setCls(c); storageSet("last-class", c.id); }}
              className="rounded-xl border border-slate-200 bg-white py-4 text-lg font-bold text-slate-800 hover:border-brand-500 hover:bg-brand-50"
            >
              {c.name}
            </button>
          ))}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
      <ChevronLeft size={16} /> Quay lại
    </button>
  );
}
