"use client";

import { CalendarClock, ExternalLink, Upload } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { cellStatus, formatDateTime } from "@/lib/status";
import type { StudentCompetitionDto } from "@/types";

export function StudentCompetitionCard({ c, onUpload }: { c: StudentCompetitionDto; onUpload: () => void }) {
  const status = cellStatus(c.mySubmission, c);
  const pastDeadline = new Date(c.deadline).getTime() < Date.now();
  const canSubmit = !c.isArchived && c.status === "ACTIVE" && (!pastDeadline || c.allowLateSubmission);
  const daysLeft = Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{c.title}</h3>
        <StatusBadge status={status} className="shrink-0" />
      </div>
      {c.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{c.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CalendarClock size={14} /> Hạn: {formatDateTime(c.deadline)}
          {!pastDeadline && daysLeft <= 3 && <b className="text-rose-600"> (còn {daysLeft} ngày)</b>}
        </span>
        {c.mySubmission && <span>Đã nộp lúc {formatDateTime(c.mySubmission.submittedAt)}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {c.link && (
          <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <ExternalLink size={16} /> Vào thi
          </a>
        )}
        {canSubmit && (
          <button className={c.mySubmission ? "btn-ghost" : "btn-primary"} onClick={onUpload}>
            <Upload size={16} /> {c.mySubmission ? "Nộp lại" : "Nộp minh chứng"}
          </button>
        )}
        {c.mySubmission?.hasImage && (
          <a href={`/api/submissions/${c.mySubmission.id}/image`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Xem ảnh đã nộp
          </a>
        )}
      </div>
    </div>
  );
}
