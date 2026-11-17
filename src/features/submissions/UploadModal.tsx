"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ErrorBox, Notice } from "@/components/ui";
import type { MySubmissionDto, StudentCompetitionDto } from "@/types";
import { compressForUpload, uploadWithRetry } from "./compress";

export function UploadModal({
  competition,
  onClose,
  onDone,
}: {
  competition: StudentCompetitionDto;
  onClose: () => void;
  onDone: (s: MySubmissionDto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ image: File; thumb: File } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState(competition.mySubmission?.note || "");
  const [stage, setStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");
    setStage("compressing");
    try {
      const out = await compressForUpload(file);
      setFiles(out);
      setPreview(URL.createObjectURL(out.image));
    } catch (err) {
      setError((err as Error).message || "Không đọc được ảnh");
    } finally {
      setStage("idle");
    }
  };

  const submit = async () => {
    if (!files) return;
    setStage("uploading");
    setError("");
    try {
      const form = new FormData();
      form.append("competitionId", competition.id);
      form.append("image", files.image);
      form.append("thumb", files.thumb);
      if (note.trim()) form.append("note", note.trim());
      const res = await uploadWithRetry(form);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Nộp bài thất bại");
      onDone(data.submission);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStage("idle");
    }
  };

  const busy = stage !== "idle";
  const late = new Date(competition.deadline).getTime() < Date.now();

  return (
    <Modal
      title="Nộp minh chứng"
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>Huỷ</button>
          <button className="btn-primary" onClick={submit} disabled={!files || busy}>
            {stage === "uploading" && <Loader2 size={16} className="animate-spin" />}
            {stage === "uploading" ? "Đang gửi..." : "Nộp bài"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="font-semibold text-slate-900">{competition.title}</div>
        {late && <Notice kind="warn">Đã quá hạn. Bài nộp lần đầu sẽ được ghi nhận là nộp muộn.</Notice>}
        {competition.mySubmission && <Notice>Em đã nộp rồi. Nộp lại sẽ thay ảnh cũ.</Notice>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-slate-600 hover:border-brand-500"
        >
          {stage === "compressing" ? (
            <><Loader2 className="animate-spin" /> Đang xử lý ảnh...</>
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Ảnh minh chứng" className="max-h-72 rounded-lg object-contain" />
          ) : (
            <>
              <div className="flex gap-3"><Camera /><ImagePlus /></div>
              <span className="text-sm font-medium">Chụp ảnh hoặc chọn ảnh chụp màn hình kết quả</span>
            </>
          )}
        </button>
        {files && (
          <p className="text-center text-xs text-slate-500">
            Ảnh đã nén: {Math.round(files.image.size / 1024)} KB · <button className="underline" onClick={() => inputRef.current?.click()}>Chọn ảnh khác</button>
          </p>
        )}

        <div>
          <label className="label">Ghi chú (không bắt buộc)</label>
          <input className="input" maxLength={500} placeholder="VD: Đạt 9/10 điểm" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <ErrorBox message={error} />}
      </div>
    </Modal>
  );
}
