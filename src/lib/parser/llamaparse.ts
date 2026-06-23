// ═══════════════════════════════════════════════════════════════════════════════
// LlamaParse Client Wrapper
// Converts PDF documents to layout-aware Markdown
// ═══════════════════════════════════════════════════════════════════════════════

const LLAMA_CLOUD_BASE_URL = "https://api.cloud.llamaindex.ai/api/v1";

interface LlamaParseJobResponse {
  id: string;
  status: string;
}

interface LlamaParseResultResponse {
  markdown: string;
  pages?: number;
  job_metadata?: Record<string, unknown>;
}

/**
 * Parse a PDF file using LlamaParse API.
 * Returns the Markdown output.
 */
export async function parsePdfToMarkdown(
  fileBuffer: Buffer,
  fileName: string,
  options?: {
    parsingInstructions?: string;
    resultType?: "markdown" | "text";
  }
): Promise<{ markdown: string; pages: number | null }> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY is required for PDF parsing");
  }

  // 1. Upload file and create parsing job
  const formData = new FormData();
  const uint8 = new Uint8Array(fileBuffer);
  
  // Determine mime type from filename
  let mimeType = "application/octet-stream";
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
  else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) mimeType = "text/html";
  else if (lowerName.endsWith(".txt") || lowerName.endsWith(".text")) mimeType = "text/plain";
  else if (lowerName.endsWith(".doc")) mimeType = "application/msword";
  else if (lowerName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const blob = new Blob([uint8], { type: mimeType });
  formData.append("file", blob, fileName);
  formData.append("result_type", options?.resultType || "markdown");

  if (options?.parsingInstructions) {
    formData.append("parsing_instruction", options.parsingInstructions);
  }

  // Use premium parsing mode for financial documents
  formData.append("premium_mode", "true");

  const uploadResponse = await fetch(`${LLAMA_CLOUD_BASE_URL}/parsing/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`LlamaParse upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  const job: LlamaParseJobResponse = await uploadResponse.json();
  const jobId = job.id;

  // 2. Poll for completion
  const maxWaitMs = 90_000; // 90 seconds max
  const pollIntervalMs = 3_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await fetch(
      `${LLAMA_CLOUD_BASE_URL}/parsing/job/${jobId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`LlamaParse status check failed: ${statusResponse.status}`);
    }

    const statusData: LlamaParseJobResponse = await statusResponse.json();

    if (statusData.status === "SUCCESS") {
      break;
    }

    if (statusData.status === "ERROR" || statusData.status === "FAILED") {
      throw new Error(`LlamaParse job failed with status: ${statusData.status}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // 3. Retrieve result
  const resultResponse = await fetch(
    `${LLAMA_CLOUD_BASE_URL}/parsing/job/${jobId}/result/markdown`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!resultResponse.ok) {
    throw new Error(`LlamaParse result retrieval failed: ${resultResponse.status}`);
  }

  const result: LlamaParseResultResponse = await resultResponse.json();

  return {
    markdown: result.markdown,
    pages: result.pages ?? null,
  };
}
