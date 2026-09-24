"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { useDataStore } from "@/stores/data";

/**
 * StoreHydrator ensures the deterministic mock database is hydrated
 * and seeded into Zustand / localStorage on first client mount.
 */
export function StoreHydrator() {
  const demoNow = useSessionStore((s) => s.demoNow);
  const ensureSeeded = useDataStore((s) => s.ensureSeeded);

  useEffect(() => {
    ensureSeeded(demoNow);
  }, [demoNow, ensureSeeded]);

  return null;
}
