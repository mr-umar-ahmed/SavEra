"use client";

import { useEffect, useState } from "react";

/**
 * `true` once the component has mounted on the client.
 * Portal pages render skeletons while this is `false` so that persisted
 * Zustand state never causes a hydration mismatch.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
