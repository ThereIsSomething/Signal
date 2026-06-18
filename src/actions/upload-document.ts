// ═══════════════════════════════════════════════════════════════════════════════
// Server Action: Upload Document
// Handles form submission from the dropzone component
// ═══════════════════════════════════════════════════════════════════════════════

"use server";

import type { UploadResult } from "@/lib/utils/types";

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${appUrl}/api/parse`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || "Upload failed" };
    }

    return { success: true, documentId: result.documentId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
