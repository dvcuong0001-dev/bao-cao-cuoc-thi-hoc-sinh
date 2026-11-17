"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { CellStatus } from "@/types";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/status";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={18} /> {label || "Đang tải..."}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {message}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 font-semibold underline">
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function StatusBadge({ status, className }: { status: CellStatus; className?: string }) {
  return (
    <span className={clsx("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx("h-full rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-slate-600">{pct}%</span>
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3 text-sm",
        kind === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        kind === "warn" && "border-amber-200 bg-amber-50 text-amber-900",
        kind === "info" && "border-sky-200 bg-sky-50 text-sky-900"
      )}
    >
      {children}
    </div>
  );
}
