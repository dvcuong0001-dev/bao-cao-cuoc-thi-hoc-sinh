"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Modal } from "@/components/Modal";
import { ErrorBox, Notice } from "@/components/ui";
import { PinSlipsModal } from "@/features/pins/PinSlipsModal";
import { useYears } from "@/features/reports/useYears";
import type { PinSlip } from "@/types";
import { parseStudentPaste } from "./parseStudentPaste";

const BATCH = 100;

type Skipped = { name: string; className: string; reason: string };

export function ImportStudentsModal({ onClose }: { onClose: () => void }) {
  const { current } = useYears();
  const [text, setText] = useState("");
  const [year, setYear] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState("");
  const [slips, setSlips] = useState<PinSlip[] | null>(null);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const parsed = useMemo(() => parseStudentPaste(text), [text]);
  const academicYear = year || current;

  const run = async () => {
    setError("");
    const all: PinSlip[] = [];
    const skip: Skipped[] = [];
    try {
      for (let i = 0; i < parsed.rows.length; i += BATCH) {
        setProgress(`Đang nhập ${Math.min(i + BATCH, parsed.rows.length)}/${parsed.rows.length}...`);
        const res = await api<{ created: PinSlip[]; skipped: Skipped[] }>("/api/students/import", {
          json: { academicYear, rows: parsed.rows.slice(i, i + BATCH) },
        });
        all.push(...res.created);
        skip.push(...res.skipped);
      }
    } catch (e) {
      setError(`${(e as Error).message}. Đã nhập được ${all.length} học sinh trước khi lỗi.`);
    } finally {
      setProgress("");
      setSkipped(skip);
      if (all.length) setSlips(all);
    }
  };

  if (slips) {
    return <PinSlipsModal slips={slips} onClose={() => { setSlips(null); if (skipped.length === 0) onClose(); }} />;
  }

  return (
    <Modal
      title="Nhập học sinh từ Excel"
      onClose={progress ? undefined : onClose}
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={!!progress}>Đóng</button>
          <button className="btn-primary" onClick={run} disabled={!!progress || parsed.rows.length === 0 || !academicYear}>
            {progress || `Nhập ${parsed.rows.length} học sinh`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Notice>
          Trong Excel, bôi đen các cột theo thứ tự <b>Lớp | Họ và tên | Ngày sinh | Mã HS</b> (ngày sinh dạng dd/mm/yyyy, ngày sinh và mã HS có thể bỏ trống), copy rồi dán vào ô dưới. Lớp chưa có sẽ tự tạo. Học sinh trùng (cùng lớp, tên, ngày sinh) sẽ được bỏ qua.
        </Notice>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Năm học</label>
          <input className="input w-36" value={academicYear} onChange={(e) => setYear(e.target.value)} placeholder="2026-2027" />
        </div>
        <textarea
          className="input min-h-[220px] font-mono text-xs"
          placeholder={"6A1\tNguyễn Văn An\t12/03/2014\n6A1\tTrần Thị Bình\t05/07/2014"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-sm text-slate-600">
          Đọc được <b>{parsed.rows.length}</b> học sinh ở <b>{new Set(parsed.rows.map((r) => r.className)).size}</b> lớp.
        </p>
        {parsed.errors.length > 0 && (
          <ErrorBox message={`${parsed.errors.length} dòng bị bỏ qua: ${parsed.errors.slice(0, 5).join("; ")}${parsed.errors.length > 5 ? "..." : ""}`} />
        )}
        {error && <ErrorBox message={error} />}
        {skipped.length > 0 && (
          <Notice kind="warn">
            <b>{skipped.length} học sinh không được nhập:</b>
            <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5">
              {skipped.map((s, i) => <li key={i}>{s.className} - {s.name}: {s.reason}</li>)}
            </ul>
          </Notice>
        )}
      </div>
    </Modal>
  );
}
