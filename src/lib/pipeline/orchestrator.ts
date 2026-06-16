// ═══════════════════════════════════════════════════════════════════════════════
// Pipeline Orchestrator
// Sequential execution: parse → section → extract → tone → risk → memo
// All LLM calls go through the rate limiter (40 RPM max)
// ═══════════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiter } from "@/lib/nim/rate-limiter";
import { nimChatCompletion, nimEmbedding, NIM_MODEL } from "@/lib/nim/client";
import { parsePdfToMarkdown } from "@/lib/parser/llamaparse";
import {
  splitIntoSections,
  getFinancialSections,
  getRiskSections,
  getToneSections,
} from "@/lib/parser/section-splitter";
import {
  EXTRACT_METRICS_SYSTEM_PROMPT,
  buildExtractMetricsPrompt,
} from "@/lib/nim/prompts/extract-metrics";
import {
  ANALYZE_TONE_SYSTEM_PROMPT,
  buildAnalyzeTonePrompt,
} from "@/lib/nim/prompts/analyze-tone";
import {
  EXTRACT_RISKS_SYSTEM_PROMPT,
  buildExtractRisksPrompt,
} from "@/lib/nim/prompts/extract-risks";
import {
  GENERATE_MEMO_SYSTEM_PROMPT,
  buildGenerateMemoPrompt,
} from "@/lib/nim/prompts/generate-memo";
import type {
  DocumentStatus,
  PipelineStep,
  FilingType,
} from "@/lib/utils/types";

const supabase = createAdminClient();

/**
 * Helper to safely parse LLM JSON output that might be wrapped in Markdown code blocks.
 */
function parseLLMJson(content: string | undefined | null, fallback: string = "{}") {
  if (!content) return JSON.parse(fallback);
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

/**
 * Log a pipeline step to the pipeline_runs table.
 */
async function logPipelineStep(
  documentId: string,
  step: PipelineStep,
  status: "pending" | "running" | "completed" | "failed",
  details?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs?: number;
    errorMessage?: string;
    inputPreview?: string;
    outputPreview?: string;
  }
) {
  const now = new Date().toISOString();
  await supabase.from("pipeline_runs").insert({
    document_id: documentId,
    step,
    status,
    started_at: status === "running" ? now : null,
    completed_at: status === "completed" || status === "failed" ? now : null,
    duration_ms: details?.durationMs ?? null,
    input_tokens: details?.inputTokens ?? null,
    output_tokens: details?.outputTokens ?? null,
    total_tokens:
      details?.inputTokens && details?.outputTokens
        ? details.inputTokens + details.outputTokens
        : null,
    model_used: NIM_MODEL,
    error_message: details?.errorMessage ?? null,
    retry_count: 0,
    input_preview: details?.inputPreview?.slice(0, 500) ?? null,
    output_preview: details?.outputPreview?.slice(0, 500) ?? null,
    metadata: {},
  });
}

/**
 * Update document status.
 */
async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  errorMessage?: string
) {
  await supabase
    .from("documents")
    .update({
      status,
      ...(errorMessage && { error_message: errorMessage }),
    })
    .eq("id", documentId);
}

/**
 * Run the complete pipeline sequentially for a document.
 */
export async function runPipeline(
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  companyId: string,
  companyName: string,
  filingType: FilingType,
  fiscalYear: number,
  fiscalQuarter: number | null
): Promise<void> {
  const fiscalPeriod = fiscalQuarter
    ? `Q${fiscalQuarter} ${fiscalYear}`
    : `FY${fiscalYear}`;

  try {
    // ─── Step 1: Parse PDF to Markdown ───────────────────────────────
    await updateDocumentStatus(documentId, "parsing");
    await logPipelineStep(documentId, "parse", "running");
    const parseStart = Date.now();

    const { markdown, pages } = await parsePdfToMarkdown(fileBuffer, fileName, {
      parsingInstructions:
        "This is an SEC financial filing (10-K/10-Q) or earnings transcript. Preserve all table structures, numerical data, and section headers exactly.",
    });

    await supabase
      .from("documents")
      .update({
        raw_markdown: markdown,
        page_count: pages,
        parse_duration_ms: Date.now() - parseStart,
      })
      .eq("id", documentId);

    await logPipelineStep(documentId, "parse", "completed", {
      durationMs: Date.now() - parseStart,
      outputPreview: markdown,
    });

    // ─── Step 2: Split into Sections ─────────────────────────────────
    await updateDocumentStatus(documentId, "sectioning");
    await logPipelineStep(documentId, "section", "running");

    const sections = splitIntoSections(markdown, filingType);

    // Store sections in DB
    const sectionInserts = sections.map((s) => ({
      document_id: documentId,
      section_key: s.key,
      section_title: s.title,
      section_order: s.order,
      content: s.content,
      word_count: s.wordCount,
      char_count: s.charCount,
      metadata: {},
    }));

    await supabase.from("document_sections").insert(sectionInserts);

    // Store parsed sections as JSONB on the document
    const parsedSections: Record<string, string> = {};
    sections.forEach((s) => {
      parsedSections[s.key] = s.content;
    });

    await supabase
      .from("documents")
      .update({
        parsed_sections: parsedSections,
        section_count: sections.length,
      })
      .eq("id", documentId);

    await logPipelineStep(documentId, "section", "completed", {
      outputPreview: `Split into ${sections.length} sections: ${sections.map((s) => s.key).join(", ")}`,
    });

    // ─── Step 3: Extract Financial Metrics ────────────────────────────
    await updateDocumentStatus(documentId, "extracting");
    await logPipelineStep(documentId, "extract_metrics", "running");
    const metricsStart = Date.now();

    const financialSections = getFinancialSections(sections);
    const financialText = financialSections.map((s) => s.content).join("\n\n---\n\n");

    const metricsResponse = await rateLimiter.enqueue(() =>
      nimChatCompletion(
        [
          { role: "system", content: EXTRACT_METRICS_SYSTEM_PROMPT },
          { role: "user", content: buildExtractMetricsPrompt(financialText, companyName, fiscalPeriod) },
        ],
        { temperature: 0.05, maxTokens: 4096 }
      )
    );

    const metricsJson = parseLLMJson(metricsResponse.choices[0]?.message?.content, "{}");

    await supabase.from("financial_metrics").insert({
      document_id: documentId,
      company_id: companyId,
      fiscal_year: fiscalYear,
      fiscal_quarter: fiscalQuarter,
      period_type: fiscalQuarter ? "quarterly" : "annual",
      revenue: metricsJson.revenue || null,
      cost_of_revenue: metricsJson.cost_of_revenue || null,
      gross_profit: metricsJson.gross_profit || null,
      gross_margin: metricsJson.gross_margin || null,
      operating_income: metricsJson.operating_income || null,
      operating_margin: metricsJson.operating_margin || null,
      net_income: metricsJson.net_income || null,
      net_margin: metricsJson.net_margin || null,
      ebitda: metricsJson.ebitda || null,
      ebitda_margin: metricsJson.ebitda_margin || null,
      operating_cash_flow: metricsJson.operating_cash_flow || null,
      free_cash_flow: metricsJson.free_cash_flow || null,
      capex: metricsJson.capex || null,
      total_debt: metricsJson.total_debt || null,
      net_debt: metricsJson.net_debt || null,
      cash_and_equivalents: metricsJson.cash_and_equivalents || null,
      eps_basic: metricsJson.eps_basic || null,
      eps_diluted: metricsJson.eps_diluted || null,
      shares_outstanding: metricsJson.shares_outstanding || null,
      yoy_revenue_growth: metricsJson.yoy_revenue_growth || null,
      qoq_revenue_growth: null,
      yoy_ebitda_growth: null,
      yoy_net_income_growth: metricsJson.yoy_net_income_growth || null,
      guidance: metricsJson.guidance || null,
      raw_extraction: metricsJson,
      confidence_score: metricsJson.confidence_score || null,
      metadata: {},
    });

    await logPipelineStep(documentId, "extract_metrics", "completed", {
      durationMs: Date.now() - metricsStart,
      inputTokens: metricsResponse.usage?.prompt_tokens,
      outputTokens: metricsResponse.usage?.completion_tokens,
      outputPreview: JSON.stringify(metricsJson),
    });

    // ─── Step 4: Analyze Tone ────────────────────────────────────────
    await updateDocumentStatus(documentId, "analyzing_tone");
    await logPipelineStep(documentId, "analyze_tone", "running");
    const toneStart = Date.now();

    const toneSections = getToneSections(sections);

    for (const section of toneSections) {
      const toneResponse = await rateLimiter.enqueue(() =>
        nimChatCompletion(
          [
            { role: "system", content: ANALYZE_TONE_SYSTEM_PROMPT },
            {
              role: "user",
              content: buildAnalyzeTonePrompt(
                section.content,
                section.title,
                companyName,
                fiscalPeriod
              ),
            },
          ],
          { temperature: 0.1, maxTokens: 4096 }
        )
      );

      const toneJson = parseLLMJson(toneResponse.choices[0]?.message?.content, "{}");

      await supabase.from("tone_analyses").insert({
        document_id: documentId,
        section_id: null,
        section_key: section.key,
        sentiment_score: toneJson.sentiment_score ?? 0.5,
        confidence_score: toneJson.confidence_score ?? 0.5,
        hedging_score: toneJson.hedging_score ?? 0.5,
        overall_tone: toneJson.overall_tone || "neutral",
        key_phrases: toneJson.key_phrases || [],
        notable_passages: toneJson.notable_passages || [],
        prior_document_id: null,
        sentiment_delta: null,
        confidence_delta: null,
        hedging_delta: null,
        tone_shift_summary: null,
        raw_analysis: toneJson,
        metadata: {},
      });
    }

    await logPipelineStep(documentId, "analyze_tone", "completed", {
      durationMs: Date.now() - toneStart,
    });

    // ─── Step 5: Extract Risk Factors ────────────────────────────────
    await updateDocumentStatus(documentId, "extracting_risks");
    await logPipelineStep(documentId, "extract_risks", "running");
    const risksStart = Date.now();

    const riskSections = getRiskSections(sections);
    const riskText = riskSections.map((s) => s.content).join("\n\n---\n\n");

    const risksResponse = await rateLimiter.enqueue(() =>
      nimChatCompletion(
        [
          { role: "system", content: EXTRACT_RISKS_SYSTEM_PROMPT },
          { role: "user", content: buildExtractRisksPrompt(riskText, companyName, fiscalPeriod) },
        ],
        { temperature: 0.1, maxTokens: 8192 }
      )
    );

    const risksJson = parseLLMJson(risksResponse.choices[0]?.message?.content, '{"risks":[]}');

    if (risksJson.risks && Array.isArray(risksJson.risks)) {
      const riskInserts = risksJson.risks.map(
        (r: Record<string, unknown>, idx: number) => ({
          document_id: documentId,
          company_id: companyId,
          risk_title: (r.risk_title as string) || "Untitled Risk",
          risk_category: (r.risk_category as string) || "other",
          severity: (r.severity as string) || "medium",
          risk_text: (r.risk_text as string) || "",
          risk_summary: (r.risk_summary as string) || null,
          is_new: false,
          is_escalated: false,
          is_removed: false,
          display_order: idx + 1,
          raw_extraction: r,
          metadata: {},
        })
      );

      await supabase.from("risk_factors").insert(riskInserts);
    }

    await logPipelineStep(documentId, "extract_risks", "completed", {
      durationMs: Date.now() - risksStart,
      inputTokens: risksResponse.usage?.prompt_tokens,
      outputTokens: risksResponse.usage?.completion_tokens,
    });

    // ─── Step 6: Generate Embeddings ─────────────────────────────────
    await logPipelineStep(documentId, "generate_embeddings", "running");

    // Generate risk embeddings
    const { data: riskFactors } = await supabase
      .from("risk_factors")
      .select("id, risk_text")
      .eq("document_id", documentId);

    if (riskFactors && riskFactors.length > 0) {
      const riskTexts = riskFactors.map((r) => r.risk_text);
      const riskEmbeddings = await rateLimiter.enqueue(() =>
        nimEmbedding(riskTexts)
      );

      const riskEmbInserts = riskFactors.map((r, i) => ({
        risk_factor_id: r.id,
        document_id: documentId,
        embedding: JSON.stringify(riskEmbeddings[i]),
      }));

      // Insert embeddings one at a time due to vector format
      for (const insert of riskEmbInserts) {
        await supabase.rpc("match_risk_embeddings", {
          query_embedding: [] as never, // Placeholder — actual insert uses raw SQL or separate insert
        }).then(() => {});

        // Direct insert with embedding
        await supabase.from("risk_embeddings").insert({
          risk_factor_id: insert.risk_factor_id,
          document_id: insert.document_id,
          embedding: insert.embedding as unknown as number[],
        });
      }
    }

    await logPipelineStep(documentId, "generate_embeddings", "completed");

    // ─── Step 7: Generate Investment Memo ─────────────────────────────
    await updateDocumentStatus(documentId, "generating_memo");
    await logPipelineStep(documentId, "generate_memo", "running");
    const memoStart = Date.now();

    const metricsStr = JSON.stringify(metricsJson, null, 2);

    const { data: toneData } = await supabase
      .from("tone_analyses")
      .select("*")
      .eq("document_id", documentId);
    const toneStr = JSON.stringify(toneData || [], null, 2);

    const risksStr = JSON.stringify(risksJson.risks || [], null, 2);

    const memoResponse = await rateLimiter.enqueue(() =>
      nimChatCompletion(
        [
          { role: "system", content: GENERATE_MEMO_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildGenerateMemoPrompt(
              companyName,
              fiscalPeriod,
              metricsStr,
              toneStr,
              risksStr
            ),
          },
        ],
        { temperature: 0.3, maxTokens: 8192 }
      )
    );

    const memoJson = parseLLMJson(memoResponse.choices[0]?.message?.content, "{}");

    // Build full markdown memo
    const memoMarkdown = [
      `# Investment Memo: ${companyName} (${fiscalPeriod})`,
      "",
      "## Company Overview",
      memoJson.company_overview || "",
      "",
      "## Financial Summary",
      memoJson.financial_summary || "",
      "",
      "## Bull Case",
      memoJson.bull_case || "",
      "",
      "## Bear Case",
      memoJson.bear_case || "",
      "",
      "## Key Risks",
      memoJson.key_risks || "",
      "",
      "## Questions to Investigate",
      memoJson.questions_to_investigate || "",
    ].join("\n");

    await supabase.from("investment_memos").insert({
      document_id: documentId,
      company_id: companyId,
      memo_markdown: memoMarkdown,
      sections: {
        company_overview: memoJson.company_overview || "",
        financial_summary: memoJson.financial_summary || "",
        bull_case: memoJson.bull_case || "",
        bear_case: memoJson.bear_case || "",
        key_risks: memoJson.key_risks || "",
        questions_to_investigate: memoJson.questions_to_investigate || "",
      },
      evidence_refs: memoJson.evidence_refs || [],
      model_used: NIM_MODEL,
      prompt_tokens: memoResponse.usage?.prompt_tokens ?? null,
      completion_tokens: memoResponse.usage?.completion_tokens ?? null,
      generation_time_ms: Date.now() - memoStart,
      is_edited: false,
      edited_markdown: null,
      last_edited_at: null,
      metadata: {},
    });

    await logPipelineStep(documentId, "generate_memo", "completed", {
      durationMs: Date.now() - memoStart,
      inputTokens: memoResponse.usage?.prompt_tokens,
      outputTokens: memoResponse.usage?.completion_tokens,
    });

    // ─── Done ────────────────────────────────────────────────────────
    await updateDocumentStatus(documentId, "completed");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown pipeline error";
    console.error(`[Pipeline] Error for document ${documentId}:`, errorMessage);
    await updateDocumentStatus(documentId, "failed", errorMessage);
    throw error;
  }
}
