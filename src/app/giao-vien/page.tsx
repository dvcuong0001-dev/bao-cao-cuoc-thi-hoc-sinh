"use client";

import { useState } from "react";
import clsx from "clsx";
import { KeyRound, LogOut } from "lucide-react";
import { useMe } from "@/features/auth/useMe";
import { ChangePinModal } from "@/features/auth/ChangePinModal";
import { ClassesTab } from "@/features/classes/ClassesTab";
import { SchoolReportTab } from "@/features/reports/SchoolReportTab";
import { CompetitionsTab } from "@/features/admin/CompetitionsTab";
import { ClassesAdminTab } from "@/features/admin/ClassesAdminTab";
import { TeachersTab } from "@/features/admin/TeachersTab";
import { YearTab } from "@/features/admin/YearTab";
import { Spinner } from "@/components/ui";

const TABS = [
  { id: "classes", label: "Lớp của tôi", admin: false },
  { id: "report", label: "Báo cáo", admin: false },
  { id: "competitions", label: "Cuộc thi", admin: true },
  { id: "manage", label: "Lớp & học sinh", admin: true },
  { id: "teachers", label: "Giáo viên", admin: true },
  { id: "year", label: "Năm học", admin: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function TeacherHome() {
  const { me, loading, reload, logout } = useMe("teacher");
  const [tab, setTab] = useState<TabId>("classes");
  const [changePin, setChangePin] = useState(false);

  if (loading || !me || me.kind !== "teacher") return <Spinner />;
  const admin = me.role === "ADMIN" || me.role === "SUPER_ADMIN";
  const tabs = TABS.filter((t) => admin || !t.admin);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-xs text-slate-500">{admin ? "Quản trị viên" : "Giáo viên"}</div>
            <div className="font-bold text-slate-900">{me.name}</div>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost px-3" onClick={() => setChangePin(true)} title="Đổi PIN"><KeyRound size={16} /></button>
            <button className="btn-ghost px-3" onClick={logout} title="Đăng xuất"><LogOut size={16} /></button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold",
                tab === t.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {admin && t.id === "classes" ? "Theo dõi lớp" : t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4">
        {tab === "classes" && <ClassesTab isAdmin={admin} />}
        {tab === "report" && <SchoolReportTab />}
        {admin && tab === "competitions" && <CompetitionsTab />}
        {admin && tab === "manage" && <ClassesAdminTab />}
        {admin && tab === "teachers" && <TeachersTab isSuperAdmin={me.role === "SUPER_ADMIN"} meId={me.id} />}
        {admin && tab === "year" && <YearTab />}
      </main>

      {(me.mustChangePin || changePin) && (
        <ChangePinModal forced={me.mustChangePin} onClose={() => setChangePin(false)} onDone={() => { setChangePin(false); reload(); }} />
      )}
    </div>
  );
}
