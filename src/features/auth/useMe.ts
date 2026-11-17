"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { MeDto } from "@/types";

/** Lấy người dùng hiện tại; nếu sai loại tài khoản thì đưa về trang đăng nhập */
export function useMe(expect?: "teacher" | "student") {
  const router = useRouter();
  const [me, setMe] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { user } = await api<{ user: MeDto | null }>("/api/auth/me");
      if (expect && (!user || user.kind !== expect)) {
        router.replace("/");
        return;
      }
      setMe(user);
    } catch {
      if (expect) router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [expect, router]);

  useEffect(() => {
    reload();
  }, [reload]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/");
  }, [router]);

  return { me, loading, reload, logout };
}
