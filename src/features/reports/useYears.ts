"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

export function useYears() {
  const [years, setYears] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  useEffect(() => {
    api<{ years: string[]; current: string }>("/api/meta/years")
      .then((d) => {
        setYears(d.years);
        setCurrent(d.current);
      })
      .catch(() => null);
  }, []);
  return { years, current };
}
