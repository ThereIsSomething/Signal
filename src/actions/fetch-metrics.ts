// ═══════════════════════════════════════════════════════════════════════════════
// Server Action: Fetch Metrics
// Reads financial metrics from Supabase for display
// ═══════════════════════════════════════════════════════════════════════════════

"use server";

import { createClient } from "@/lib/supabase/server";
import type { FinancialMetric, MetricWithDelta, MetricValue } from "@/lib/utils/types";
import { METRIC_LABELS } from "@/lib/utils/constants";

export async function fetchMetricsForDocument(
  documentId: string
): Promise<FinancialMetric | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("financial_metrics")
    .select("*")
    .eq("document_id", documentId)
    .single();

  if (error || !data) return null;
  return data as FinancialMetric;
}

export async function fetchMetricsComparison(
  companyId: string,
  fiscalYear: number,
  priorFiscalYear: number
): Promise<MetricWithDelta[]> {
  const supabase = await createClient();

  const { data: currentMetrics } = await supabase
    .from("financial_metrics")
    .select("*")
    .eq("company_id", companyId)
    .eq("fiscal_year", fiscalYear)
    .single();

  const { data: priorMetrics } = await supabase
    .from("financial_metrics")
    .select("*")
    .eq("company_id", companyId)
    .eq("fiscal_year", priorFiscalYear)
    .single();

  const metricKeys = Object.keys(METRIC_LABELS);
  const comparisons: MetricWithDelta[] = [];

  for (const key of metricKeys) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVal = (currentMetrics as any)?.[key] as MetricValue | null ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priorVal = (priorMetrics as any)?.[key] as MetricValue | null ?? null;

    let delta: number | null = null;
    let deltaType: "positive" | "negative" | "neutral" = "neutral";

    if (currentVal?.value != null && priorVal?.value != null && priorVal.value !== 0) {
      delta = (currentVal.value - priorVal.value) / Math.abs(priorVal.value);
      deltaType = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
    }

    comparisons.push({
      label: METRIC_LABELS[key],
      current: currentVal,
      prior: priorVal,
      delta,
      deltaType,
    });
  }

  return comparisons;
}
