import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    if (!documentId) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the document to find the file_path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", documentId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching document:", fetchError);
      return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }

    // 2. If it has a file_path, delete it from storage
    if (document?.file_path) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Error deleting from storage:", storageError);
        // We continue to delete the DB record even if storage deletion fails
      }
    }

    // 3. Delete the document record from the database (Cascades to all relations)
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("Error deleting document record:", deleteError);
      return NextResponse.json({ error: "Failed to delete document record" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unhandled error deleting document:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
