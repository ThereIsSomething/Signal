import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPipeline, getNextStepToRun } from "@/lib/pipeline/orchestrator";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId } = body as { documentId?: string };

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId in body" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: doc } = await supabase
      .from("documents")
      .select("id, status")
      .eq("id", documentId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.status === "completed") {
      return NextResponse.json({ status: "completed", message: "Pipeline already complete" });
    }

    const nextStep = await getNextStepToRun(documentId);
    if (!nextStep) {
      await supabase.from("documents").update({ status: "completed" }).eq("id", documentId);
      return NextResponse.json({ status: "completed", message: "Pipeline complete" });
    }

    // Run all remaining steps sequentially in this request
    // WARNING: On Vercel serverless this may hit the 300s timeout if steps are slow.
    // Prefer step-by-step via POST /api/pipeline/{id}/step instead.
    console.log(`[Pipeline Resume] Starting full pipeline for ${documentId} from step ${nextStep}`);
    await runPipeline(documentId);

    return NextResponse.json({ status: "completed", message: "Pipeline finished" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pipeline Resume] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
