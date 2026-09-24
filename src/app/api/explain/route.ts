import { NextResponse } from "next/server";
import { explain, type ExplanationContext, type ExplanationKind } from "@/lib/engine/explain";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { kind?: ExplanationKind; ctx?: ExplanationContext };
    if (!body || !body.kind) {
      return NextResponse.json({ error: "Missing explanation kind" }, { status: 400 });
    }

    const text = explain(body.kind, body.ctx ?? {});
    return NextResponse.json({ explanation: text });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate explanation" },
      { status: 500 },
    );
  }
}
