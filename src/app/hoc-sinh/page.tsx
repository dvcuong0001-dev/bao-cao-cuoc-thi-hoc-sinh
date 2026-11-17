"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { useMe } from "@/features/auth/useMe";
import { ChangePinModal } from "@/features/auth/ChangePinModal";
import { StudentCompetitionCard } from "@/features/submissions/StudentCompetitionCard";
import { UploadModal } from "@/features/submissions/UploadModal";
import { api } from "@/lib/client";
import { Empty, ErrorBox, Spinner } from "@/components/ui";
import type { StudentCompetitionDto } from "@/types";

export default function StudentHome() {
  const { me, loading, reload, logout } = useMe("student");
  const [items, setItems] = useState<StudentCompetitionDto[] | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<StudentCompetitionDto | null>(null);
  const [changePin, setChangePin] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const { competitions } = await api<{ competitions: StudentCompetitionDto[] }>("/api/competitions");
      setItems(competitions);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  if (loading || !me || me.kind !== "student") return <Spinner />;

  const open = (items || []).filter((c) => !c.mySubmission && c.status === "ACTIVE" && !c.isArchived);
  const others = (items || []).filter((c) => !open.includes(c));

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Lớp {me.className}</div>
          <h1 className="text-lg font-bold text-slate-900">{me.name}</h1>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost px-3" onClick={() => setChangePin(true)} title="Đổi PIN"><KeyRound size={16} /></button>
          <button className="btn-ghost px-3" onClick={logout} title="Đăng xuất"><LogOut size={16} /></button>
        </div>
      </header>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && <Empty>Lớp em chưa có cuộc thi nào.</Empty>}

      {open.length > 0 && <h2 className="mb-2 mt-2 text-sm font-bold uppercase text-rose-600">Cần nộp ({open.length})</h2>}
      <div className="space-y-3">
        {open.map((c) => <StudentCompetitionCard key={c.id} c={c} onUpload={() => setUploading(c)} />)}
      </div>
      {others.length > 0 && <h2 className="mb-2 mt-6 text-sm font-bold uppercase text-slate-500">Các cuộc thi khác</h2>}
      <div className="space-y-3">
        {others.map((c) => <StudentCompetitionCard key={c.id} c={c} onUpload={() => setUploading(c)} />)}
      </div>

      {uploading && (
        <UploadModal
          competition={uploading}
          onClose={() => setUploading(null)}
          onDone={(s) => {
            setItems((list) => (list || []).map((c) => (c.id === uploading.id ? { ...c, mySubmission: s } : c)));
            setUploading(null);
          }}
        />
      )}
      {(me.mustChangePin || changePin) && (
        <ChangePinModal
          forced={me.mustChangePin}
          onClose={() => setChangePin(false)}
          onDone={() => { setChangePin(false); reload(); }}
        />
      )}
    </main>
  );
}
