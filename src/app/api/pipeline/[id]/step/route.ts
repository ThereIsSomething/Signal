import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNextStepToRun, runStepByName } from "@/lib/pipeline/orchestrator";
import { PIPELINE_STEP_LABELS } from "@/lib/utils/constants";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
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
      return NextResponse.json({ step: null, status: "completed", message: "Pipeline already complete" });
    }

    const nextStep = await getNextStepToRun(documentId);

    if (!nextStep) {
      await supabase.from("documents").update({ status: "completed" }).eq("id", documentId);
      return NextResponse.json({ step: null, status: "completed", message: "Pipeline complete" });
    }

    await runStepByName(documentId, nextStep);

    const { data: updatedDoc } = await supabase
      .from("documents")
      .select("id, status")
      .eq("id", documentId)
      .single();

    const nextAfter = await getNextStepToRun(documentId);

    return NextResponse.json({
      step: nextStep,
      stepLabel: PIPELINE_STEP_LABELS[nextStep],
      status: updatedDoc?.status ?? "unknown",
      hasMore: nextAfter !== null,
      nextStep: nextAfter,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pipeline Step] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
