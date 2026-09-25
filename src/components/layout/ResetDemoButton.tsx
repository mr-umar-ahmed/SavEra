"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { useLpgOpsStore } from "@/stores/lpgOps";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const [loading, setLoading] = useState(false);
  const demoNow = useSessionStore((s) => s.demoNow);
  const resetDemo = useDataStore((s) => s.resetDemo);

  const handleReset = async () => {
    setLoading(true);
    try {
      resetDemo(demoNow);
      useLpgOpsStore.getState().reset();
      toast.success("Demo database reset", {
        description: `All households, utility logs, and cases re-anchored to ${demoNow}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      onClick={handleReset}
      disabled={loading}
      className="h-10 gap-2 px-4 text-sm"
      title="Reset mock database to default seeded state"
    >
      <RotateCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Reset Demo</span>
    </Button>
  );
}
