"use client";

import clsx from "clsx";
import type { ClassDto } from "@/types";

/** Chọn lớp theo khối: bấm khối để chọn/bỏ cả khối, bấm lớp để chọn từng lớp */
export function ClassPicker({
  classes,
  value,
  onChange,
}: {
  classes: ClassDto[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(value);
  const grades = Array.from(new Set(classes.map((c) => c.grade))).sort((a, b) => a - b);

  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => onChange(classes.map((c) => c.id))}>
          Chọn tất cả
        </button>
        <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={() => onChange([])}>
          Bỏ chọn
        </button>
      </div>
      {grades.map((g) => {
        const list = classes.filter((c) => c.grade === g);
        const allOn = list.every((c) => selected.has(c.id));
        return (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggle(list.map((c) => c.id), !allOn)}
              className={clsx("w-20 rounded-lg px-2 py-1 text-xs font-bold", allOn ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-700")}
            >
              Khối {g}
            </button>
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle([c.id], !selected.has(c.id))}
                className={clsx(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  selected.has(c.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        );
      })}
      <p className="text-xs text-slate-500">Đã chọn {value.length} lớp</p>
    </div>
  );
}
