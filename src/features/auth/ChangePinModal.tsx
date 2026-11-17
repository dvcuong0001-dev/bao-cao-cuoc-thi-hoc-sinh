"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Modal } from "@/components/Modal";
import { ErrorBox, Notice } from "@/components/ui";

/** Đổi PIN. forced = bắt buộc đổi ở lần đăng nhập đầu (không cho đóng) */
export function ChangePinModal({ forced, onClose, onDone }: { forced?: boolean; onClose?: () => void; onDone: () => void }) {
  const [currentPin, setCurrent] = useState("");
  const [newPin, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirm) return setError("Hai lần nhập PIN mới không khớp");
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/change-pin", { json: { currentPin, newPin } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);

  return (
    <Modal title={forced ? "Đặt mã PIN của riêng mình" : "Đổi mã PIN"} onClose={forced ? undefined : onClose}>
      <form onSubmit={submit} className="space-y-3">
        {forced && <Notice kind="warn">Lần đầu đăng nhập, hãy đổi PIN được cấp sang PIN 6 số của riêng mình và ghi nhớ.</Notice>}
        <div>
          <label className="label">PIN hiện tại (PIN trên phiếu)</label>
          <input className="input" type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrent(digits(e.target.value))} />
        </div>
        <div>
          <label className="label">PIN mới (6 số)</label>
          <input className="input" type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNew(digits(e.target.value))} />
        </div>
        <div>
          <label className="label">Nhập lại PIN mới</label>
          <input className="input" type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} />
        </div>
        {error && <ErrorBox message={error} />}
        <button className="btn-primary w-full" disabled={busy || newPin.length !== 6 || !currentPin}>
          {busy ? "Đang lưu..." : "Lưu PIN mới"}
        </button>
      </form>
    </Modal>
  );
}
