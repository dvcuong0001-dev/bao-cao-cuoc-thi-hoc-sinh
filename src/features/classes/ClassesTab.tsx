"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { api } from "@/lib/client";
import { Empty, ErrorBox, Spinner } from "@/components/ui";
import type { ClassDto } from "@/types";
import { ClassDetail } from "./ClassDetail";

/** Danh sách lớp được xem (GVCN/người xem) hoặc toàn bộ lớp (admin) */
export function ClassesTab({ isAdmin }: { isAdmin: boolean }) {
  const [classes, setClasses] = useState<ClassDto[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api<{ classes: ClassDto[] }>("/api/classes")
      .then(({ classes }) => {
        setClasses(classes);
        if (!isAdmin && classes.length === 1) setOpenId(classes[0].id);
      })
      .catch((e) => setError(e.message));
  }, [isAdmin]);

  const byGrade = useMemo(() => {
    const m = new Map<number, ClassDto[]>();
    for (const c of classes || []) m.set(c.grade, [...(m.get(c.grade) || []), c]);
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [classes]);

  if (openId) return <ClassDetail classId={openId} onBack={() => setOpenId(null)} />;
  if (error) return <ErrorBox message={error} />;
  if (!classes) return <Spinner />;
  if (classes.length === 0) {
    return <Empty>Bạn chưa được phân quyền xem lớp nào. Hãy liên hệ quản trị viên.</Empty>;
  }

  return (
    <div className="space-y-5">
      {byGrade.map(([grade, list]) => (
        <section key={grade}>
          <h2 className="mb-2 text-sm font-bold uppercase text-slate-500">Khối {grade}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {list.map((c) => (
              <button key={c.id} onClick={() => setOpenId(c.id)} className="card p-3 text-left hover:border-brand-500">
                <div className="text-lg font-bold text-slate-900">{c.name}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users size={12} /> {c.studentCount} học sinh
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  {c.viewers.filter((v) => v.role === "HOMEROOM").map((v) => v.name).join(", ") || "Chưa có GVCN"}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
