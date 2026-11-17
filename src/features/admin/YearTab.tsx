"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox, Notice } from "@/components/ui";
import { useYears } from "@/features/reports/useYears";

/** Kết chuyển năm học: lên lớp cho học sinh, lớp cuối cấp ra trường */
export function YearTab() {
  const { years, current } = useYears();
  const [fromYear, setFromYear] = useState("");
  const [maxGrade, setMaxGrade] = useState(9);
  const [copyViewers, setCopyViewers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const y = fromYear || current;

  const run = async () => {
    const next = `${Number(y.slice(0, 4)) + 1}-${Number(y.slice(0, 4)) + 2}`;
    if (!confirm(`Kết chuyển từ năm học ${y} sang ${next}?\n- Học sinh khối < ${maxGrade} lên lớp (6A1 → 7A1)\n- Học sinh khối ${maxGrade} chuyển sang ngừng hoạt động\nThao tác này KHÔNG hoàn tác tự động được.`)) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ toYear: string; classes: number; promoted: number; graduated: number }>("/api/admin/rollover", {
        json: { fromYear: y, maxGrade, copyViewers },
      });
      setResult(`Đã kết chuyển ${r.classes} lớp sang năm học ${r.toYear}: ${r.promoted} học sinh lên lớp, ${r.graduated} học sinh ra trường.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="font-bold text-slate-900">Kết chuyển năm học</h2>
        <Notice kind="warn">
          Làm vào đầu năm học mới, sau khi đã xuất báo cáo năm cũ. Lớp cũ vẫn được giữ (ngừng hoạt động) để xem lại báo cáo. Sau khi kết chuyển, nhớ phân quyền GVCN cho các lớp mới và nhập học sinh khối đầu cấp.
        </Notice>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Từ năm học</label>
            <select className="input" value={y} onChange={(e) => setFromYear(e.target.value)}>
              {years.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Khối cuối cấp</label>
            <input className="input" type="number" min={1} max={12} value={maxGrade} onChange={(e) => setMaxGrade(Number(e.target.value))} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={copyViewers} onChange={(e) => setCopyViewers(e.target.checked)} />
          Giữ nguyên GVCN và người xem theo lớp (GVCN đi theo lớp lên khối mới)
        </label>
        {error && <ErrorBox message={error} />}
        {result && <Notice kind="success">{result}</Notice>}
        <button className="btn-danger" onClick={run} disabled={busy || !y}>{busy ? "Đang kết chuyển..." : "Kết chuyển năm học"}</button>
      </div>
      <div className="card p-4 text-sm text-slate-600">
        <h2 className="mb-1 font-bold text-slate-900">Dọn ảnh minh chứng</h2>
        Vào mục <b>Cuộc thi</b>, với cuộc thi đã hết hạn bấm <b>Lưu trữ</b> để xoá ảnh trên kho lưu trữ (giữ lại lịch sử nộp bài). Nên xuất Excel báo cáo trước khi lưu trữ.
      </div>
    </div>
  );
}
