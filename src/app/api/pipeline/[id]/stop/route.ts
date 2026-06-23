import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const documentId = (await params).id;

  if (!documentId) {
    return NextResponse.json(
      { error: "Missing document ID" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: "Pipeline stopped by user",
      })
      .eq("id", documentId);

    if (error) {
      console.error("[API /pipeline/stop] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update document status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API /pipeline/stop] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
