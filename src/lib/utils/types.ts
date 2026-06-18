// ═══════════════════════════════════════════════════════════════════════════════
// TypeScript Type Definitions
// Database types, API interfaces, and shared domain types
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Database Types (mirrors Supabase schema)
// ─────────────────────────────────────────────────────────────────────────────

export type FilingType = "10-K" | "10-Q" | "earnings_transcript" | "annual_report" | "other";

export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "parsed"
  | "sectioning"
  | "extracting"
  | "analyzing_tone"
  | "extracting_risks"
  | "generating_memo"
  | "completed"
  | "failed";

export type PipelineStep =
  | "parse"
  | "section"
  | "extract_metrics"
  | "analyze_tone"
  | "extract_risks"
  | "compare_risks"
  | "generate_embeddings"
  | "generate_memo";

export type RiskChangeType = "new" | "escalated" | "unchanged" | "deescalated" | "removed";
export type RiskSeverity = "critical" | "high" | "medium" | "low" | "informational";
export type MetricPeriodType = "annual" | "quarterly" | "ttm" | "guidance";

// ─────────────────────────────────────────────────────────────────────────────
// JSONB Value Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricValue {
  value: number | null;
  unit: "USD" | "USD_M" | "USD_B" | "pct" | "x" | "shares" | "bps" | string;
  raw_text?: string;
}

export interface GuidanceRange {
  revenue_low?: MetricValue;
  revenue_high?: MetricValue;
  eps_low?: MetricValue;
  eps_high?: MetricValue;
  ebitda_low?: MetricValue;
  ebitda_high?: MetricValue;
  notes?: string;
}

export interface TonePhrase {
  text: string;
  type: "hedging" | "confident" | "cautious" | "defensive" | "optimistic";
  context: string;
}

export interface NotablePassage {
  text: string;
  sentiment: string;
  line?: number;
  page?: number;
}

export interface EvidenceRef {
  section: string;
  source_section: string;
  quote: string;
  page?: number;
}

export interface MemoSections {
  company_overview: string;
  financial_summary: string;
  bull_case: string;
  bear_case: string;
  key_risks: string;
  questions_to_investigate: string;
}

export interface CapitalAllocation {
  buybacks?: MetricValue;
  dividends?: MetricValue;
  rd_spend?: MetricValue;
  ma_spend?: MetricValue;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row Types (what Supabase returns)
// ─────────────────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  ticker: string;
  name: string;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  filing_type: FilingType;
  fiscal_year: number;
  fiscal_quarter: number | null;
  fiscal_period: string;
  filing_date: string | null;
  status: DocumentStatus;
  error_message: string | null;
  file_name: string;
  file_size_bytes: number | null;
  file_path: string | null;
  raw_markdown: string | null;
  parsed_sections: Record<string, string>;
  section_count: number;
  page_count: number | null;
  parse_duration_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentSection {
  id: string;
  document_id: string;
  section_key: string;
  section_title: string;
  section_order: number;
  content: string;
  word_count: number | null;
  char_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FinancialMetric {
  id: string;
  document_id: string;
  company_id: string;
  fiscal_year: number;
  fiscal_quarter: number | null;
  period_type: MetricPeriodType;
  revenue: MetricValue | null;
  cost_of_revenue: MetricValue | null;
  gross_profit: MetricValue | null;
  gross_margin: MetricValue | null;
  operating_income: MetricValue | null;
  operating_margin: MetricValue | null;
  net_income: MetricValue | null;
  net_margin: MetricValue | null;
  ebitda: MetricValue | null;
  ebitda_margin: MetricValue | null;
  operating_cash_flow: MetricValue | null;
  free_cash_flow: MetricValue | null;
  capex: MetricValue | null;
  total_debt: MetricValue | null;
  net_debt: MetricValue | null;
  cash_and_equivalents: MetricValue | null;
  eps_basic: MetricValue | null;
  eps_diluted: MetricValue | null;
  shares_outstanding: MetricValue | null;
  yoy_revenue_growth: MetricValue | null;
  qoq_revenue_growth: MetricValue | null;
  yoy_ebitda_growth: MetricValue | null;
  yoy_net_income_growth: MetricValue | null;
  guidance: GuidanceRange | null;
  raw_extraction: Record<string, unknown> | null;
  confidence_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompetitorBenchmark {
  id: string;
  benchmark_group: string;
  company_id: string;
  fiscal_year: number;
  fiscal_quarter: number | null;
  metrics: Record<string, MetricValue>;
  capital_allocation: CapitalAllocation;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ToneAnalysis {
  id: string;
  document_id: string;
  section_id: string | null;
  section_key: string;
  sentiment_score: number;
  confidence_score: number;
  hedging_score: number;
  overall_tone: string | null;
  key_phrases: TonePhrase[];
  notable_passages: NotablePassage[];
  prior_document_id: string | null;
  sentiment_delta: number | null;
  confidence_delta: number | null;
  hedging_delta: number | null;
  tone_shift_summary: string | null;
  raw_analysis: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RiskFactor {
  id: string;
  document_id: string;
  company_id: string;
  risk_title: string;
  risk_category: string;
  severity: RiskSeverity;
  risk_text: string;
  risk_summary: string | null;
  is_new: boolean;
  is_escalated: boolean;
  is_removed: boolean;
  display_order: number;
  raw_extraction: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RiskComparison {
  id: string;
  current_document_id: string;
  prior_document_id: string;
  risk_id_current: string | null;
  risk_id_prior: string | null;
  change_type: RiskChangeType;
  similarity_score: number | null;
  diff_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface InvestmentMemo {
  id: string;
  document_id: string;
  company_id: string;
  memo_markdown: string;
  sections: MemoSections;
  evidence_refs: EvidenceRef[];
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generation_time_ms: number | null;
  is_edited: boolean;
  edited_markdown: string | null;
  last_edited_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PipelineRun {
  id: string;
  document_id: string;
  step: PipelineStep;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  model_used: string | null;
  error_message: string | null;
  retry_count: number;
  input_preview: string | null;
  output_preview: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Database Type (for createClient generics)
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Company, "id" | "created_at" | "updated_at">>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "fiscal_period" | "created_at" | "updated_at">;
        Update: Partial<Omit<Document, "id" | "fiscal_period" | "created_at" | "updated_at">>;
      };
      document_sections: {
        Row: DocumentSection;
        Insert: Omit<DocumentSection, "id" | "created_at">;
        Update: Partial<Omit<DocumentSection, "id" | "created_at">>;
      };
      financial_metrics: {
        Row: FinancialMetric;
        Insert: Omit<FinancialMetric, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<FinancialMetric, "id" | "created_at" | "updated_at">>;
      };
      competitor_benchmarks: {
        Row: CompetitorBenchmark;
        Insert: Omit<CompetitorBenchmark, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CompetitorBenchmark, "id" | "created_at" | "updated_at">>;
      };
      tone_analyses: {
        Row: ToneAnalysis;
        Insert: Omit<ToneAnalysis, "id" | "created_at">;
        Update: Partial<Omit<ToneAnalysis, "id" | "created_at">>;
      };
      tone_embeddings: {
        Row: {
          id: string;
          tone_analysis_id: string;
          document_id: string;
          section_key: string;
          passage_index: number;
          passage_text: string;
          embedding: number[];
          created_at: string;
        };
        Insert: Omit<{ id: string; tone_analysis_id: string; document_id: string; section_key: string; passage_index: number; passage_text: string; embedding: number[]; created_at: string }, "id" | "created_at">;
        Update: Partial<Omit<{ id: string; tone_analysis_id: string; document_id: string; section_key: string; passage_index: number; passage_text: string; embedding: number[]; created_at: string }, "id" | "created_at">>;
      };
      risk_factors: {
        Row: RiskFactor;
        Insert: Omit<RiskFactor, "id" | "created_at">;
        Update: Partial<Omit<RiskFactor, "id" | "created_at">>;
      };
      risk_embeddings: {
        Row: {
          id: string;
          risk_factor_id: string;
          document_id: string;
          embedding: number[];
          created_at: string;
        };
        Insert: Omit<{ id: string; risk_factor_id: string; document_id: string; embedding: number[]; created_at: string }, "id" | "created_at">;
        Update: Partial<Omit<{ id: string; risk_factor_id: string; document_id: string; embedding: number[]; created_at: string }, "id" | "created_at">>;
      };
      risk_comparisons: {
        Row: RiskComparison;
        Insert: Omit<RiskComparison, "id" | "created_at">;
        Update: Partial<Omit<RiskComparison, "id" | "created_at">>;
      };
      investment_memos: {
        Row: InvestmentMemo;
        Insert: Omit<InvestmentMemo, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<InvestmentMemo, "id" | "created_at" | "updated_at">>;
      };
      pipeline_runs: {
        Row: PipelineRun;
        Insert: Omit<PipelineRun, "id" | "created_at">;
        Update: Partial<Omit<PipelineRun, "id" | "created_at">>;
      };
    };
    Functions: {
      match_tone_embeddings: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_document_id?: string;
        };
        Returns: {
          id: string;
          tone_analysis_id: string;
          document_id: string;
          section_key: string;
          passage_text: string;
          similarity: number;
        }[];
      };
      match_risk_embeddings: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_document_id?: string;
        };
        Returns: {
          id: string;
          risk_factor_id: string;
          document_id: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      filing_type: FilingType;
      document_status: DocumentStatus;
      pipeline_step: PipelineStep;
      risk_change_type: RiskChangeType;
      risk_severity: RiskSeverity;
      metric_period_type: MetricPeriodType;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API / Component Prop Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentWithCompany extends Document {
  company: Company;
}

/**
 * Result type for Supabase joins: documents.*, companies(name, ticker)
 */
export type DocumentWithCompanyJoin = Document & {
  companies: Pick<Company, "name" | "ticker"> | null;
  company_name?: string;
  company_ticker?: string;
};

export interface MetricWithDelta {
  label: string;
  current: MetricValue | null;
  prior: MetricValue | null;
  delta: number | null;
  deltaType: "positive" | "negative" | "neutral";
}

export interface PipelineProgress {
  documentId: string;
  currentStep: PipelineStep | null;
  completedSteps: PipelineStep[];
  failedStep: PipelineStep | null;
  errorMessage: string | null;
  totalSteps: number;
  progress: number; // 0.0–1.0
}

export interface UploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}
