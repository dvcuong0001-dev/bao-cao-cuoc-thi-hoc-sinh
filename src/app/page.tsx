"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { GraduationCap, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import type { MeDto } from "@/types";
import { StudentLogin } from "@/features/auth/StudentLogin";
import { TeacherLogin } from "@/features/auth/TeacherLogin";
import { Spinner } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"student" | "teacher">("student");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<{ user: MeDto | null }>("/api/auth/me")
      .then(({ user }) => {
        if (user) router.replace(user.kind === "student" ? "/hoc-sinh" : "/giao-vien");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const onDone = (kind: "student" | "teacher") => router.replace(kind === "student" ? "/hoc-sinh" : "/giao-vien");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <GraduationCap size={30} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Báo cáo cuộc thi học sinh</h1>
        <p className="mt-1 text-sm text-slate-500">Nộp minh chứng tham gia cuộc thi</p>
      </div>

      {checking ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
            {(["student", "teacher"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold",
                  tab === t ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"
                )}
              >
                {t === "student" ? <GraduationCap size={16} /> : <UserRound size={16} />}
                {t === "student" ? "Học sinh" : "Giáo viên"}
              </button>
            ))}
          </div>
          <div className="card p-4">
            {tab === "student" ? (
              <StudentLogin onDone={() => onDone("student")} />
            ) : (
              <TeacherLogin onDone={() => onDone("teacher")} />
            )}
          </div>
        </>
      )}
    </main>
  );
}
