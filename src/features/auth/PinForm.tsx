"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

/** Ô nhập PIN + gửi đăng nhập */
export function PinForm({
  endpoint,
  accountId,
  onDone,
}: {
  endpoint: string;
  accountId: string;
  onDone: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    setError("");
    try {
      await api(endpoint, { json: { id: accountId, pin } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label" htmlFor="pin">
        Mã PIN
      </label>
      <input
        id="pin"
        className="input text-center text-2xl tracking-[0.5em]"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={8}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        autoFocus
      />
      {error && <ErrorBox message={error} />}
      <button className="btn-primary w-full py-3" disabled={busy || pin.length < 4}>
        {busy && <Loader2 size={16} className="animate-spin" />} Đăng nhập
      </button>
    </form>
  );
}
