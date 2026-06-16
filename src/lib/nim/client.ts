// ═══════════════════════════════════════════════════════════════════════════════
// Nvidia NIM API Client
// OpenAI-compatible wrapper for meta/llama-3.3-70b-instruct
// ═══════════════════════════════════════════════════════════════════════════════

import OpenAI from "openai";

let nimClient: OpenAI | null = null;

export function getNimClient(): OpenAI {
  if (nimClient) return nimClient;

  if (!process.env.NVIDIA_NIM_API_KEY) {
    throw new Error("NVIDIA_NIM_API_KEY is required");
  }

  nimClient = new OpenAI({
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseURL: process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
  });

  return nimClient;
}

export const NIM_MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct";
export const NIM_EMBEDDING_MODEL = process.env.NVIDIA_NIM_EMBEDDING_MODEL || "nvidia/nv-embedqa-e5-v5";
export const NIM_RPM_LIMIT = parseInt(process.env.NVIDIA_NIM_RPM_LIMIT || "40", 10);

/**
 * Send a chat completion request to Nvidia NIM.
 * Always use the rate limiter wrapper instead of calling this directly.
 */
export async function nimChatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: OpenAI.Chat.ChatCompletionCreateParams["response_format"];
  }
): Promise<OpenAI.Chat.ChatCompletion> {
  const client = getNimClient();

  const response = await client.chat.completions.create({
    model: NIM_MODEL,
    messages,
    temperature: options?.temperature ?? 0.1,
    max_tokens: options?.maxTokens ?? 4096,
    ...(options?.responseFormat && { response_format: options.responseFormat }),
  });

  return response;
}

/**
 * Generate embeddings via Nvidia NIM.
 */
export async function nimEmbedding(
  input: string | string[]
): Promise<number[][]> {
  const client = getNimClient();

  const response = await client.embeddings.create({
    model: NIM_EMBEDDING_MODEL,
    input,
    encoding_format: "float",
    // NV-Embed-QA requires input_type at the root
    input_type: "passage",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return response.data.map((d) => d.embedding);
}
