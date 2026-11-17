"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Modal } from "@/components/Modal";
import { ErrorBox } from "@/components/ui";
import type { ClassDto, CompetitionDto } from "@/types";
import { ClassPicker } from "./ClassPicker";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CompetitionFormModal({
  initial,
  classes,
  onClose,
  onSaved,
}: {
  initial: CompetitionDto | null;
  classes: ClassDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaultDeadline = new Date(Date.now() + 7 * 86400000);
  defaultDeadline.setHours(22, 0, 0, 0);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [link, setLink] = useState(initial?.link || "");
  const [deadline, setDeadline] = useState(toLocalInput(initial?.deadline || defaultDeadline.toISOString()));
  const [allowLate, setAllowLate] = useState(initial?.allowLateSubmission ?? true);
  const [classIds, setClassIds] = useState<string[]>(initial?.classIds || []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const json = {
        title,
        description: description || null,
        link: link || null,
        deadline: new Date(deadline).toISOString(),
        allowLateSubmission: allowLate,
        classIds,
      };
      if (initial) await api(`/api/competitions/${initial.id}`, { method: "PATCH", json });
      else await api("/api/competitions", { json });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={initial ? "Sửa cuộc thi" : "Tạo cuộc thi mới"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Huỷ</button>
          <button className="btn-primary" onClick={save} disabled={busy || title.trim().length < 3 || classIds.length === 0}>
            {busy ? "Đang lưu..." : "Lưu"}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Tên cuộc thi *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Mô tả / hướng dẫn</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </div>
        <div>
          <label className="label">Đường dẫn vào thi</label>
          <input className="input" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div>
          <label className="label">Hạn chót *</label>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} />
          Vẫn nhận bài sau hạn chót (đánh dấu nộp muộn)
        </label>
        <div className="sm:col-span-2">
          <label className="label">Giao cho lớp *</label>
          <ClassPicker classes={classes} value={classIds} onChange={setClassIds} />
        </div>
        {error && <div className="sm:col-span-2"><ErrorBox message={error} /></div>}
      </div>
    </Modal>
  );
}
