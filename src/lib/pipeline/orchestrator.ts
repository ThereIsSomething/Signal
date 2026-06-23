import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiter } from "@/lib/nim/rate-limiter";
import { nimChatCompletion, nimEmbedding, NIM_MODEL } from "@/lib/nim/client";
import { parsePdfToMarkdown } from "@/lib/parser/llamaparse";
import {
  splitIntoSections,
  getFinancialSections,
  getRiskSections,
  getToneSections,
  type ParsedSection,
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
import { PIPELINE_STEPS_ORDER } from "@/lib/utils/constants";
import type {
  DocumentStatus,
  PipelineStep,
  FilingType,
  MetricValue,
} from "@/lib/utils/types";

function toParsedSection(row: Record<string, unknown>): ParsedSection {
  return {
    key: row.section_key as string,
    title: row.section_title as string,
    content: row.content as string,
    order: row.section_order as number,
    wordCount: row.word_count as number,
    charCount: row.char_count as number,
    startLine: row.start_line as number || 0,
    endLine: row.end_line as number || 0,
  };
}

let _supabase: ReturnType<typeof createAdminClient> | null = null;
const supabase = new Proxy({} as ReturnType<typeof createAdminClient>, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = createAdminClient();
    }
    return Reflect.get(_supabase, prop as any);
  }
});

function parseLLMJson(content: string | undefined | null, fallback: string = "{}") {
  if (!content) return JSON.parse(fallback);
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

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

async function heartbeatPipelineStep(documentId: string, step: PipelineStep) {
  const now = new Date().toISOString();
  console.log(`[Pipeline] Heartbeat ${step} for ${documentId} at ${now}`);
  await supabase
    .from("pipeline_runs")
    .update({ metadata: { last_heartbeat_at: now } })
    .eq("document_id", documentId)
    .eq("step", step)
    .eq("status", "running");
}

function startHeartbeat(documentId: string, step: PipelineStep, intervalMs = 15_000) {
  const interval = setInterval(() => {
    heartbeatPipelineStep(documentId, step).catch(() => {});
  }, intervalMs);
  return () => clearInterval(interval);
}

async function getDocument(documentId: string) {
  const { data } = await supabase
    .from("documents")
    .select("*, companies!inner(name, ticker)")
    .eq("id", documentId)
    .single();
  return data as Record<string, unknown> | null;
}

/**
 * Determine the next pipeline step that needs to run.
 * Returns null if all steps are completed.
 */
export async function getNextStepToRun(documentId: string): Promise<PipelineStep | null> {
  const { data: runs } = await supabase
    .from("pipeline_runs")
    .select("step, status")
    .eq("document_id", documentId);

  for (const step of PIPELINE_STEPS_ORDER) {
    const run = runs?.find((r) => r.step === step);
    if (!run) return step;
    if (run.status === "failed") return step;
    if (run.status === "running") return step;
  }
  return null;
}

// ─── Step 1: Parse ───────────────────────────────────────────────

export async function runStepParse(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const filePath = doc.file_path as string;
  const fileName = doc.file_name as string;
  if (!filePath) throw new Error("No file_path on document");

  await updateDocumentStatus(documentId, "parsing");
  await logPipelineStep(documentId, "parse", "running");
  const stopHeartbeat = startHeartbeat(documentId, "parse");
  const parseStart = Date.now();

  try {
    const { data: fileData, error: dlError } = await supabase.storage
      .from("documents")
      .download(filePath);
    if (dlError || !fileData) throw new Error(`Failed to download file from storage: ${dlError?.message}`);
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

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
  } finally {
    stopHeartbeat();
  }
}

// ─── Step 2: Section ─────────────────────────────────────────────

export async function runStepSection(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const markdown = doc.raw_markdown as string;
  const filingType = doc.filing_type as FilingType;
  if (!markdown) throw new Error("No raw_markdown on document — run parse step first");

  await updateDocumentStatus(documentId, "sectioning");
  await logPipelineStep(documentId, "section", "running");

  const sections = splitIntoSections(markdown, filingType);

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
}

// ─── Step 3: Extract Metrics ─────────────────────────────────────

export async function runStepExtractMetrics(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyId = doc.company_id as string;
  const companyName = (doc.companies as Record<string, unknown>)?.name as string;
  const fiscalYear = doc.fiscal_year as number;
  const fiscalQuarter = doc.fiscal_quarter as number | null;
  const fiscalPeriod = fiscalQuarter ? `Q${fiscalQuarter} ${fiscalYear}` : `FY${fiscalYear}`;

  const { data: rawSections } = await supabase
    .from("document_sections")
    .select("*")
    .eq("document_id", documentId);

  if (!rawSections || rawSections.length === 0) throw new Error("No sections found — run section step first");
  const sections: ParsedSection[] = rawSections.map((r) => toParsedSection(r as Record<string, unknown>));

  await updateDocumentStatus(documentId, "extracting");
  await logPipelineStep(documentId, "extract_metrics", "running");
  const stopHeartbeat = startHeartbeat(documentId, "extract_metrics");
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
  stopHeartbeat();
}

// ─── Step 4: Analyze Tone ────────────────────────────────────────

export async function runStepAnalyzeTone(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyName = (doc.companies as Record<string, unknown>)?.name as string;
  const fiscalYear = doc.fiscal_year as number;
  const fiscalQuarter = doc.fiscal_quarter as number | null;
  const fiscalPeriod = fiscalQuarter ? `Q${fiscalQuarter} ${fiscalYear}` : `FY${fiscalYear}`;

  const { data: rawSections } = await supabase
    .from("document_sections")
    .select("*")
    .eq("document_id", documentId);

  if (!rawSections || rawSections.length === 0) throw new Error("No sections found");
  const sections: ParsedSection[] = rawSections.map((r) => toParsedSection(r as Record<string, unknown>));

  await updateDocumentStatus(documentId, "analyzing_tone");
  await logPipelineStep(documentId, "analyze_tone", "running");
  const stopHeartbeat = startHeartbeat(documentId, "analyze_tone");
  const toneStart = Date.now();

  const toneSections = getToneSections(sections);

  for (const section of toneSections) {
    const toneResponse = await rateLimiter.enqueue(() =>
      nimChatCompletion(
        [
          { role: "system", content: ANALYZE_TONE_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildAnalyzeTonePrompt(section.content, section.title, companyName, fiscalPeriod),
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
  stopHeartbeat();
}

// ─── Step 5: Extract Risks ───────────────────────────────────────

export async function runStepExtractRisks(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyId = doc.company_id as string;
  const companyName = (doc.companies as Record<string, unknown>)?.name as string;
  const fiscalYear = doc.fiscal_year as number;
  const fiscalQuarter = doc.fiscal_quarter as number | null;
  const fiscalPeriod = fiscalQuarter ? `Q${fiscalQuarter} ${fiscalYear}` : `FY${fiscalYear}`;

  const { data: rawSections } = await supabase
    .from("document_sections")
    .select("*")
    .eq("document_id", documentId);

  if (!rawSections || rawSections.length === 0) throw new Error("No sections found");
  const sections: ParsedSection[] = rawSections.map((r) => toParsedSection(r as Record<string, unknown>));

  await updateDocumentStatus(documentId, "extracting_risks");
  await logPipelineStep(documentId, "extract_risks", "running");
  const stopHeartbeat = startHeartbeat(documentId, "extract_risks");
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
  stopHeartbeat();
}

// ─── Step 6: Compare Risks ───────────────────────────────────────

export async function runStepCompareRisks(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyId = doc.company_id as string;
  const filingType = doc.filing_type as FilingType;
  const fiscalYear = doc.fiscal_year as number;

  await logPipelineStep(documentId, "compare_risks", "running");
  const stopHeartbeat = startHeartbeat(documentId, "compare_risks");
  const compareRisksStart = Date.now();

  const { data: priorDoc } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("filing_type", filingType)
    .lt("fiscal_year", fiscalYear)
    .order("fiscal_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priorDoc) {
    const { data: currentRisks } = await supabase
      .from("risk_factors")
      .select("*")
      .eq("document_id", documentId);

    const { data: priorRisks } = await supabase
      .from("risk_factors")
      .select("*")
      .eq("document_id", priorDoc.id);

    if (currentRisks && priorRisks && currentRisks.length > 0 && priorRisks.length > 0) {
      const allRiskTexts = [
        ...currentRisks.map((r) => r.risk_text),
        ...priorRisks.map((r) => r.risk_text),
      ];

      const allEmbeddings = await rateLimiter.enqueue(() =>
        nimEmbedding(allRiskTexts)
      );

      const currentEmbeds = allEmbeddings.slice(0, currentRisks.length);
      const priorEmbeds = allEmbeddings.slice(currentRisks.length);

      for (let i = 0; i < currentRisks.length; i++) {
        await supabase.from("risk_embeddings").insert({
          risk_factor_id: currentRisks[i].id,
          document_id: documentId,
          embedding: JSON.stringify(currentEmbeds[i]) as unknown as number[],
        });
      }

      const usedPriorIds = new Set<string>();

      for (const current of currentRisks) {
        const currIdx = currentRisks.indexOf(current);
        let bestMatch: { prior: typeof priorRisks[0]; score: number } | null = null;

        for (const prior of priorRisks) {
          if (usedPriorIds.has(prior.id)) continue;

          const priorIdx = priorRisks.indexOf(prior);
          const currEmb = currentEmbeds[currIdx];
          const priorEmb = priorEmbeds[priorIdx];

          let dotProduct = 0;
          let magCurr = 0;
          let magPrior = 0;
          for (let j = 0; j < currEmb.length; j++) {
            dotProduct += currEmb[j] * priorEmb[j];
            magCurr += currEmb[j] * currEmb[j];
            magPrior += priorEmb[j] * priorEmb[j];
          }
          const similarity =
            Math.sqrt(magCurr) > 0 && Math.sqrt(magPrior) > 0
              ? dotProduct / (Math.sqrt(magCurr) * Math.sqrt(magPrior))
              : 0;

          if (!bestMatch || similarity > bestMatch.score) {
            bestMatch = { prior, score: similarity };
          }
        }

        if (bestMatch && bestMatch.score > 0.7) {
          usedPriorIds.add(bestMatch.prior.id);

          const severityOrder = ["critical", "high", "medium", "low", "informational"];
          const currSeverityIdx = severityOrder.indexOf(current.severity);
          const priorSeverityIdx = severityOrder.indexOf(bestMatch.prior.severity as string);

          let changeType: "unchanged" | "escalated" | "deescalated" = "unchanged";
          if (currSeverityIdx < priorSeverityIdx) changeType = "escalated";
          else if (currSeverityIdx > priorSeverityIdx) changeType = "deescalated";

          await supabase.from("risk_comparisons").insert({
            current_document_id: documentId,
            prior_document_id: priorDoc.id,
            risk_id_current: current.id,
            risk_id_prior: bestMatch.prior.id,
            change_type: changeType,
            similarity_score: bestMatch.score,
            diff_summary: changeType === "escalated"
              ? `Risk severity escalated from ${bestMatch.prior.severity} to ${current.severity}`
              : changeType === "deescalated"
              ? `Risk severity decreased from ${bestMatch.prior.severity} to ${current.severity}`
              : "Risk severity unchanged",
            metadata: {},
          });

          if (changeType === "escalated") {
            await supabase
              .from("risk_factors")
              .update({ is_escalated: true })
              .eq("id", current.id);
          }
        } else {
          await supabase.from("risk_comparisons").insert({
            current_document_id: documentId,
            prior_document_id: priorDoc.id,
            risk_id_current: current.id,
            risk_id_prior: null,
            change_type: "new",
            similarity_score: bestMatch?.score ?? 0,
            diff_summary: "New risk factor not present in prior period",
            metadata: {},
          });

          await supabase
            .from("risk_factors")
            .update({ is_new: true })
            .eq("id", current.id);
        }
      }

      for (const prior of priorRisks) {
        if (!usedPriorIds.has(prior.id)) {
          await supabase.from("risk_comparisons").insert({
            current_document_id: documentId,
            prior_document_id: priorDoc.id,
            risk_id_current: null,
            risk_id_prior: prior.id,
            change_type: "removed",
            similarity_score: 0,
            diff_summary: "Risk factor removed in current period",
            metadata: {},
          });
        }
      }
    }
  } else {
    const { data: riskFactors } = await supabase
      .from("risk_factors")
      .select("id, risk_text")
      .eq("document_id", documentId);

    if (riskFactors && riskFactors.length > 0) {
      const riskTexts = riskFactors.map((r) => r.risk_text);
      const riskEmbeddings = await rateLimiter.enqueue(() =>
        nimEmbedding(riskTexts)
      );

      for (let i = 0; i < riskFactors.length; i++) {
        await supabase.from("risk_embeddings").insert({
          risk_factor_id: riskFactors[i].id,
          document_id: documentId,
          embedding: JSON.stringify(riskEmbeddings[i]) as unknown as number[],
        });
      }
    }
  }

  await logPipelineStep(documentId, "compare_risks", "completed", {
    durationMs: Date.now() - compareRisksStart,
  });
  stopHeartbeat();
}

// ─── Step 7: Benchmarks ─────────────────────────────────────────

export async function runStepBenchmarks(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyId = doc.company_id as string;
  const fiscalYear = doc.fiscal_year as number;
  const fiscalQuarter = doc.fiscal_quarter as number | null;
  const filingType = doc.filing_type as FilingType;

  await logPipelineStep(documentId, "generate_embeddings", "running");

  try {
    const { data: metricsRow } = await supabase
      .from("financial_metrics")
      .select("*")
      .eq("document_id", documentId)
      .maybeSingle();

    if (!metricsRow) {
      await logPipelineStep(documentId, "generate_embeddings", "completed");
      return;
    }

    const metricsJson = (metricsRow as Record<string, unknown>).raw_extraction as Record<string, unknown> || {};
    const benchmarkMetrics: Record<string, MetricValue> = {};

    if (metricsJson.revenue) benchmarkMetrics.revenue = metricsJson.revenue as MetricValue;
    if (metricsJson.gross_margin) benchmarkMetrics.gross_margin = metricsJson.gross_margin as MetricValue;
    if (metricsJson.operating_margin) benchmarkMetrics.operating_margin = metricsJson.operating_margin as MetricValue;
    if (metricsJson.net_margin) benchmarkMetrics.net_margin = metricsJson.net_margin as MetricValue;
    if (metricsJson.yoy_revenue_growth) {
      benchmarkMetrics.revenue_growth_yoy = metricsJson.yoy_revenue_growth as MetricValue;
    }

    const rev = metricsJson.revenue as MetricValue | undefined;
    const ebitda = metricsJson.ebitda as MetricValue | undefined;
    const totalDebt = metricsJson.total_debt as MetricValue | undefined;
    const capex = metricsJson.capex as MetricValue | undefined;
    const opIncome = metricsJson.operating_income as MetricValue | undefined;

    if (ebitda && rev?.value && rev.value > 0) {
      benchmarkMetrics.ebitda_margin = {
        value: (ebitda.value ?? 0) / rev.value,
        unit: "pct" as const,
        raw_text: "Computed from extracted data",
      };
    }

    if (totalDebt && ebitda?.value && ebitda.value > 0) {
      benchmarkMetrics.net_debt_to_ebitda = {
        value: (totalDebt.value ?? 0) / ebitda.value,
        unit: "x" as const,
        raw_text: "Computed from extracted data",
      };
    }

    if (capex && rev?.value && rev.value > 0) {
      benchmarkMetrics.capex_to_revenue = {
        value: (capex.value ?? 0) / rev.value,
        unit: "pct" as const,
        raw_text: "Computed from extracted data",
      };
    }

    if (opIncome && totalDebt?.value && totalDebt.value > 0) {
      benchmarkMetrics.roic = {
        value: (opIncome.value ?? 0) / totalDebt.value,
        unit: "pct" as const,
        raw_text: "Approximated from extracted data",
      };
    }

    if (Object.keys(benchmarkMetrics).length > 0) {
      const benchmarkGroup = `${filingType.replace("-", "_")}_${fiscalYear}`;

      await supabase.from("competitor_benchmarks").upsert({
        benchmark_group: benchmarkGroup,
        company_id: companyId,
        fiscal_year: fiscalYear,
        fiscal_quarter: fiscalQuarter,
        metrics: benchmarkMetrics,
        capital_allocation: {},
        metadata: {},
      }, { onConflict: "benchmark_group, company_id, fiscal_year" });
    }
  } catch (benchmarkError) {
    console.error(`[Pipeline] Benchmark population error:`, benchmarkError);
  }

  await logPipelineStep(documentId, "generate_embeddings", "completed");
}

// ─── Step 8: Generate Memo ───────────────────────────────────────

export async function runStepGenerateMemo(documentId: string): Promise<void> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const companyId = doc.company_id as string;
  const companyName = (doc.companies as Record<string, unknown>)?.name as string;
  const fiscalYear = doc.fiscal_year as number;
  const fiscalQuarter = doc.fiscal_quarter as number | null;
  const fiscalPeriod = fiscalQuarter ? `Q${fiscalQuarter} ${fiscalYear}` : `FY${fiscalYear}`;

  await updateDocumentStatus(documentId, "generating_memo");
  await logPipelineStep(documentId, "generate_memo", "running");
  const stopHeartbeat = startHeartbeat(documentId, "generate_memo");
  const memoStart = Date.now();

  const { data: metricsRow } = await supabase
    .from("financial_metrics")
    .select("raw_extraction")
    .eq("document_id", documentId)
    .maybeSingle();

  const metricsJson = metricsRow?.raw_extraction as Record<string, unknown> || {};
  const metricsStr = JSON.stringify(metricsJson, null, 2);

  const { data: toneData } = await supabase
    .from("tone_analyses")
    .select("*")
    .eq("document_id", documentId);
  const toneStr = JSON.stringify(toneData || [], null, 2);

  const { data: riskData } = await supabase
    .from("risk_factors")
    .select("*")
    .eq("document_id", documentId);
  const risksStr = JSON.stringify(riskData || [], null, 2);

  const { data: riskCompData } = await supabase
    .from("risk_comparisons")
    .select("*")
    .eq("current_document_id", documentId);
  const riskCompStr = riskCompData && riskCompData.length > 0
    ? JSON.stringify(riskCompData, null, 2)
    : undefined;

  const memoResponse = await rateLimiter.enqueue(() =>
    nimChatCompletion(
      [
        { role: "system", content: GENERATE_MEMO_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildGenerateMemoPrompt(companyName, fiscalPeriod, metricsStr, toneStr, risksStr, riskCompStr),
        },
      ],
      { temperature: 0.3, maxTokens: 8192 }
    )
  );

  const memoJson = parseLLMJson(memoResponse.choices[0]?.message?.content, "{}");

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
  stopHeartbeat();
}

/**
 * Run a specific pipeline step by name.
 * Throws if the step name is invalid.
 */
export async function runStepByName(documentId: string, step: PipelineStep): Promise<void> {
  switch (step) {
    case "parse": return runStepParse(documentId);
    case "section": return runStepSection(documentId);
    case "extract_metrics": return runStepExtractMetrics(documentId);
    case "analyze_tone": return runStepAnalyzeTone(documentId);
    case "extract_risks": return runStepExtractRisks(documentId);
    case "compare_risks": return runStepCompareRisks(documentId);
    case "generate_embeddings": return runStepBenchmarks(documentId);
    case "generate_memo": return runStepGenerateMemo(documentId);
    default: throw new Error(`Unknown pipeline step: ${step}`);
  }
}

/**
 * Run the complete pipeline sequentially from the current state.
 * Each step reads its inputs from the database, so it can be resumed.
 */
export async function runPipeline(documentId: string): Promise<void> {
  try {
    let step: PipelineStep | null;
    while ((step = await getNextStepToRun(documentId)) !== null) {
      await runStepByName(documentId, step);
    }
    await updateDocumentStatus(documentId, "completed");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown pipeline error";
    console.error(`[Pipeline] Error for document ${documentId}:`, errorMessage);
    await updateDocumentStatus(documentId, "failed", errorMessage);
    throw error;
  }
}
