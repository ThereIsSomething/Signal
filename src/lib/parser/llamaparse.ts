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

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
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

  const uploadResponse = await fetchWithTimeout(`${LLAMA_CLOUD_BASE_URL}/parsing/upload`, {
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
  const maxWaitMs = 190_000;
  const pollIntervalMs = 3_000;
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const statusResponse = await fetchWithTimeout(
      `${LLAMA_CLOUD_BASE_URL}/parsing/job/${jobId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`LlamaParse status check failed: ${statusResponse.status}`);
    }

    const statusData: LlamaParseJobResponse = await statusResponse.json();
    pollCount++;

    if (pollCount % 5 === 0 || statusData.status !== "PENDING") {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[LlamaParse] Job ${jobId} poll #${pollCount}: status=${statusData.status}, elapsed=${elapsed}s`);
    }

    if (statusData.status === "SUCCESS") {
      break;
    }

    if (statusData.status === "ERROR" || statusData.status === "FAILED") {
      throw new Error(`LlamaParse job failed with status: ${statusData.status}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // 2b. Handle timeout of the polling loop
  const timedOut = Date.now() - startTime >= maxWaitMs;
  let jobStatusAtTimeout: string | undefined;
  if (timedOut) {
    // One last check to get the actual status before giving up
    try {
      const finalCheck = await fetchWithTimeout(
        `${LLAMA_CLOUD_BASE_URL}/parsing/job/${jobId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (finalCheck.ok) {
        const data: LlamaParseJobResponse = await finalCheck.json();
        jobStatusAtTimeout = data.status;
      }
    } catch {
      // ignore – we're already failing
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[LlamaParse] TIMEOUT Job ${jobId}: elapsed=${elapsed}s, lastStatus=${jobStatusAtTimeout ?? "unknown"}, polls=${pollCount}`);
    throw new Error(
      `LlamaParse timed out after ${maxWaitMs}ms (${elapsed}s elapsed). Job ${jobId} last status: ${jobStatusAtTimeout ?? "unknown"}`
    );
  }

  // 3. Retrieve result
  const resultResponse = await fetchWithTimeout(
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
