"use client";

import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Notice } from "@/components/ui";
import { formatDate } from "@/lib/status";
import type { PinSlip } from "@/types";

/** Hiển thị và in phiếu PIN (PIN chỉ xuất hiện một lần, đóng lại là không xem lại được) */
export function PinSlipsModal({ slips, onClose }: { slips: PinSlip[]; onClose: () => void }) {
  const close = () => {
    if (confirm("Đóng lại sẽ KHÔNG xem lại được các PIN này. Bạn đã in hoặc ghi lại chưa?")) onClose();
  };
  const site = typeof window !== "undefined" ? window.location.host : "";

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3">
      {slips.map((s, i) => (
        <div key={i} className="break-inside-avoid border border-dashed border-slate-400 p-3 text-sm">
          <div className="font-bold">{s.name}</div>
          <div className="text-xs text-slate-600">
            {s.className}
            {s.dob ? ` · ${formatDate(s.dob)}` : ""}
          </div>
          <div className="mt-1">
            PIN: <span className="font-mono text-lg font-bold tracking-widest">{s.pin}</span>
          </div>
          {site && <div className="text-[10px] text-slate-500">Đăng nhập tại: {site}</div>}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Modal
        title={`Phiếu PIN (${slips.length})`}
        onClose={close}
        wide
        footer={
          <>
            <button className="btn-ghost" onClick={close}>Đóng</button>
            <button className="btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> In phiếu
            </button>
          </>
        }
      >
        <div className="mb-3">
          <Notice kind="warn">
            PIN chỉ hiển thị một lần. Hãy in ra, cắt theo đường kẻ và phát cho từng người. Lần đầu đăng nhập, mỗi người sẽ phải đổi PIN.
          </Notice>
        </div>
        {grid}
      </Modal>
      {/* Bản in: gắn thẳng vào body để in được nhiều trang */}
      {typeof document !== "undefined" && createPortal(<div className="print-area hidden print:block">{grid}</div>, document.body)}
    </>
  );
}
