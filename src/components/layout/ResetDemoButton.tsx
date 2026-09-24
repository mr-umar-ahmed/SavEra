"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const [loading, setLoading] = useState(false);
  const demoNow = useSessionStore((s) => s.demoNow);
  const resetDemo = useDataStore((s) => s.resetDemo);

  const handleReset = async () => {
    setLoading(true);
    try {
      resetDemo(demoNow);
      toast.success("Demo database reset", {
        description: `All households, utility logs, and cases re-anchored to ${demoNow}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={loading}
      className="h-8 gap-1.5 border-dashed border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 text-xs font-mono font-medium rounded-full"
      title="Reset mock database to default seeded state"
    >
      <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      <span>Reset Demo</span>
    </Button>
  );
}
