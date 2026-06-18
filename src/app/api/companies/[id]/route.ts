import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  RATE_LIMITS,
  checkRateLimitWithResponse,
} from "@/lib/rate-limit/api-rate-limiter";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 10 mutations per minute per IP
  const rateLimitResponse = checkRateLimitWithResponse(request, RATE_LIMITS.MUTATION);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ error: "Missing company ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch all documents for this company to get their file paths
    const { data: documents, error: fetchError } = await supabase
      .from("documents")
      .select("file_path")
      .eq("company_id", companyId);

    if (fetchError) {
      console.error("Error fetching documents for company:", fetchError);
      return NextResponse.json({ error: "Failed to fetch company documents" }, { status: 500 });
    }

    // 2. Delete all files from storage
    if (documents && documents.length > 0) {
      const filePaths = documents.map((d) => d.file_path).filter(Boolean) as string[];
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove(filePaths);

        if (storageError) {
          console.error("Error deleting files from storage:", storageError);
        }
      }
    }

    // 3. Delete the company record from the database (Cascades to documents and all relations)
    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteError) {
      console.error("Error deleting company record:", deleteError);
      return NextResponse.json({ error: "Failed to delete company record" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Unhandled error deleting company:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
