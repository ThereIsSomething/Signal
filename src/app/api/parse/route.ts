// ═══════════════════════════════════════════════════════════════════════════════
// API Route: POST /api/parse
// Receives a PDF file, parses it via LlamaParse, and triggers the pipeline.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import type { FilingType } from "@/lib/utils/types";

export const maxDuration = 300; // 5 minutes max (for Vercel)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const companyName = formData.get("companyName") as string;
    const ticker = formData.get("ticker") as string;
    const filingType = formData.get("filingType") as FilingType;
    const fiscalYear = parseInt(formData.get("fiscalYear") as string, 10);
    const fiscalQuarter = formData.get("fiscalQuarter")
      ? parseInt(formData.get("fiscalQuarter") as string, 10)
      : null;

    if (!file || !companyName || !ticker || !filingType || !fiscalYear) {
      return NextResponse.json(
        { error: "Missing required fields: file, companyName, ticker, filingType, fiscalYear" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Upsert company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .upsert(
        { ticker: ticker.toUpperCase(), name: companyName, metadata: {} },
        { onConflict: "ticker" }
      )
      .select("id")
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: `Failed to create company: ${companyError?.message}` },
        { status: 500 }
      );
    }

    // 2. Upload file to Supabase Storage
    const filePath = `${company.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload file to storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 3. Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        company_id: company.id,
        filing_type: filingType,
        fiscal_year: fiscalYear,
        fiscal_quarter: fiscalQuarter,
        status: "uploaded",
        file_name: file.name,
        file_size_bytes: file.size,
        raw_markdown: null,
        parsed_sections: {},
        section_count: 0,
        metadata: {},
        error_message: null,
        file_path: filePath,
        page_count: null,
        parse_duration_ms: null,
        filing_date: null,
      })
      .select("id")
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: `Failed to create document: ${docError?.message}` },
        { status: 500 }
      );
    }

    // 3. Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 4. Run pipeline in background (non-blocking)
    // In production, this would use a job queue (e.g., BullMQ, Inngest)
    // For this project, we fire-and-forget on the server
    runPipeline(
      document.id,
      fileBuffer,
      file.name,
      company.id,
      companyName,
      filingType,
      fiscalYear,
      fiscalQuarter
    ).catch((err) => {
      console.error("[API /parse] Pipeline error:", err);
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      companyId: company.id,
      message: "Document uploaded. Pipeline started.",
    });
  } catch (error) {
    console.error("[API /parse] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
