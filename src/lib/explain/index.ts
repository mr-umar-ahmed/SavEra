import {
  explain,
  type ExplanationContext,
  type ExplanationKind,
  type ExplanationProvider,
} from "@/lib/engine/explain";

export class RuleBasedExplanationProvider implements ExplanationProvider {
  async explain(kind: ExplanationKind, ctx: ExplanationContext): Promise<string> {
    return explain(kind, ctx);
  }
}

export class AnthropicExplanationProvider implements ExplanationProvider {
  private fallback = new RuleBasedExplanationProvider();

  async explain(kind: ExplanationKind, ctx: ExplanationContext): Promise<string> {
    try {
      // If running on client, fetch the server api route
      if (typeof window !== "undefined") {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, ctx }),
        });
        if (res.ok) {
          const data = (await res.json()) as { explanation: string };
          if (data.explanation) return data.explanation;
        }
      }
    } catch {
      // Silently fall back to rule-based template
    }
    return this.fallback.explain(kind, ctx);
  }
}

export const explanationProvider: ExplanationProvider = new RuleBasedExplanationProvider();
