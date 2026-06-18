-- ═══════════════════════════════════════════════════════════════════════════════
-- AI Financial Document Analyst — Supabase SQL Schema
-- Created: 2026-06-18
-- ═══════════════════════════════════════════════════════════════════════════════
-- Architecture: Deterministic Document Sectioning (NO RAG)
-- Vector dims: 1024 (nvidia/nv-embedqa-e5-v5)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Custom Enums
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE filing_type AS ENUM (
    '10-K',
    '10-Q',
    'earnings_transcript',
    'annual_report',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'uploaded',
    'parsing',
    'parsed',
    'sectioning',
    'extracting',
    'analyzing_tone',
    'extracting_risks',
    'generating_memo',
    'completed',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_step AS ENUM (
    'parse',
    'section',
    'extract_metrics',
    'analyze_tone',
    'extract_risks',
    'compare_risks',
    'generate_embeddings',
    'generate_memo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_change_type AS ENUM (
    'new',
    'escalated',
    'unchanged',
    'deescalated',
    'removed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_severity AS ENUM (
    'critical',
    'high',
    'medium',
    'low',
    'informational'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE metric_period_type AS ENUM (
    'annual',
    'quarterly',
    'ttm',
    'guidance'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Companies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker        TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  sector        TEXT,
  industry      TEXT,
  market_cap    BIGINT,
  description   TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filing_type       filing_type NOT NULL,
  fiscal_year       INTEGER NOT NULL,
  fiscal_quarter    INTEGER,                        -- NULL for annual filings
  fiscal_period     TEXT GENERATED ALWAYS AS (
    CASE
      WHEN fiscal_quarter IS NOT NULL THEN 'Q' || fiscal_quarter || ' ' || fiscal_year
      ELSE 'FY' || fiscal_year
    END
  ) STORED,
  filing_date       DATE,
  status            document_status NOT NULL DEFAULT 'uploaded',
  error_message     TEXT,

  -- Storage
  file_name         TEXT NOT NULL,
  file_size_bytes   INTEGER,
  file_path         TEXT,                           -- Supabase Storage path
  raw_markdown      TEXT,                           -- Full LlamaParse output
  parsed_sections   JSONB DEFAULT '{}',             -- { "Item 1A": "...", "Item 7": "..." }
  section_count     INTEGER DEFAULT 0,

  -- Metadata
  page_count        INTEGER,
  parse_duration_ms INTEGER,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_filing ON documents(company_id, filing_type, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_documents_period ON documents(fiscal_year, fiscal_quarter);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Document Sections (Deterministic SEC Header Splitting)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_sections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_key     TEXT NOT NULL,                    -- e.g., "item_1a", "item_7", "md_and_a"
  section_title   TEXT NOT NULL,                    -- e.g., "Item 1A. Risk Factors"
  section_order   INTEGER NOT NULL,
  content         TEXT NOT NULL,
  word_count      INTEGER,
  char_count      INTEGER,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_document ON document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_sections_key ON document_sections(section_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_doc_key ON document_sections(document_id, section_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Financial Metrics
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year     INTEGER NOT NULL,
  fiscal_quarter  INTEGER,
  period_type     metric_period_type NOT NULL DEFAULT 'annual',

  -- Core metrics stored as JSONB for flexible schema
  -- Each value: { "value": 1234567890, "unit": "USD", "raw_text": "$1.23B" }
  revenue              JSONB,
  cost_of_revenue      JSONB,
  gross_profit         JSONB,
  gross_margin         JSONB,     -- { "value": 0.45, "unit": "pct" }
  operating_income     JSONB,
  operating_margin     JSONB,
  net_income           JSONB,
  net_margin           JSONB,
  ebitda               JSONB,
  ebitda_margin        JSONB,

  -- Cash & Debt
  operating_cash_flow  JSONB,
  free_cash_flow       JSONB,
  capex                JSONB,
  total_debt           JSONB,
  net_debt             JSONB,
  cash_and_equivalents JSONB,

  -- Per Share
  eps_basic            JSONB,
  eps_diluted          JSONB,
  shares_outstanding   JSONB,

  -- Growth & Comparisons (computed after extraction)
  yoy_revenue_growth   JSONB,     -- { "value": 0.12, "unit": "pct" }
  qoq_revenue_growth   JSONB,
  yoy_ebitda_growth    JSONB,
  yoy_net_income_growth JSONB,

  -- Guidance (forward-looking)
  guidance             JSONB,     -- { "revenue_low": ..., "revenue_high": ..., "eps_low": ... }

  -- Raw extraction output
  raw_extraction       JSONB,     -- Full LLM JSON output for audit
  confidence_score     REAL,      -- 0.0–1.0 extraction confidence

  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_document ON financial_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_metrics_company ON financial_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_metrics_period ON financial_metrics(company_id, fiscal_year, fiscal_quarter);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Competitor Benchmarks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS competitor_benchmarks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  benchmark_group TEXT NOT NULL,                    -- Group identifier (e.g., "tech_mega_2024")
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year     INTEGER NOT NULL,
  fiscal_quarter  INTEGER,

  -- Benchmark data stored as flexible JSONB
  metrics         JSONB NOT NULL DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "revenue": { "value": 1234, "unit": "USD_M" },
  --   "gross_margin": { "value": 0.45, "unit": "pct" },
  --   "revenue_growth_yoy": { "value": 0.12, "unit": "pct" },
  --   "roic": { "value": 0.18, "unit": "pct" },
  --   "capex_to_revenue": { "value": 0.08, "unit": "pct" },
  --   "net_debt_to_ebitda": { "value": 1.2, "unit": "x" }
  -- }

  -- Capital allocation profile
  capital_allocation JSONB DEFAULT '{}',
  -- { "buybacks": ..., "dividends": ..., "rd_spend": ..., "ma_spend": ... }

  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_group ON competitor_benchmarks(benchmark_group);
CREATE INDEX IF NOT EXISTS idx_benchmarks_company ON competitor_benchmarks(company_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_period ON competitor_benchmarks(benchmark_group, fiscal_year);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Tone Analyses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tone_analyses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_id        UUID REFERENCES document_sections(id) ON DELETE SET NULL,
  section_key       TEXT NOT NULL,                  -- e.g., "item_7", "earnings_qa"

  -- Scores (0.0–1.0)
  sentiment_score   REAL NOT NULL,                  -- 0=very negative, 1=very positive
  confidence_score  REAL NOT NULL,                  -- management confidence level
  hedging_score     REAL NOT NULL,                  -- 0=direct, 1=heavily hedged

  -- Qualitative
  overall_tone      TEXT,                           -- "cautious", "confident", "neutral", "defensive"
  key_phrases       JSONB DEFAULT '[]',             -- [{ "text": "...", "type": "hedging", "context": "..." }]
  notable_passages  JSONB DEFAULT '[]',             -- [{ "text": "...", "sentiment": "cautious", "line": 42 }]

  -- Period-over-period comparison
  prior_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  sentiment_delta   REAL,                           -- Change vs prior period
  confidence_delta  REAL,
  hedging_delta     REAL,
  tone_shift_summary TEXT,                          -- "Shifted from confident to cautious"

  -- Raw LLM output
  raw_analysis      JSONB,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tone_document ON tone_analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_tone_section ON tone_analyses(section_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Tone Embeddings (pgvector — for semantic diffing across periods)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tone_embeddings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tone_analysis_id UUID NOT NULL REFERENCES tone_analyses(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_key     TEXT NOT NULL,
  passage_index   INTEGER NOT NULL DEFAULT 0,       -- Index within the section
  passage_text    TEXT NOT NULL,                     -- The actual text passage
  embedding       vector(1024) NOT NULL,             -- nvidia/nv-embedqa-e5-v5 output
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tone_emb_analysis ON tone_embeddings(tone_analysis_id);
CREATE INDEX IF NOT EXISTS idx_tone_emb_document ON tone_embeddings(document_id);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_tone_emb_vector ON tone_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Risk Factors
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_factors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Risk details
  risk_title      TEXT NOT NULL,
  risk_category   TEXT NOT NULL,                    -- "regulatory", "market", "operational", "financial", "legal", "cyber", "macro"
  severity        risk_severity NOT NULL DEFAULT 'medium',
  risk_text       TEXT NOT NULL,                    -- Full extracted text of the risk factor
  risk_summary    TEXT,                             -- One-line summary

  -- Flags
  is_new          BOOLEAN NOT NULL DEFAULT FALSE,   -- New vs prior period
  is_escalated    BOOLEAN NOT NULL DEFAULT FALSE,   -- Severity increased vs prior
  is_removed      BOOLEAN NOT NULL DEFAULT FALSE,   -- Present in prior but not current

  -- Ordering
  display_order   INTEGER NOT NULL DEFAULT 0,

  -- Raw LLM output
  raw_extraction  JSONB,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risks_document ON risk_factors(document_id);
CREATE INDEX IF NOT EXISTS idx_risks_company ON risk_factors(company_id);
CREATE INDEX IF NOT EXISTS idx_risks_category ON risk_factors(risk_category);
CREATE INDEX IF NOT EXISTS idx_risks_flags ON risk_factors(is_new, is_escalated);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Risk Embeddings (pgvector — for cross-period similarity matching)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_embeddings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_factor_id  UUID NOT NULL REFERENCES risk_factors(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding       vector(1024) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_emb_factor ON risk_embeddings(risk_factor_id);
CREATE INDEX IF NOT EXISTS idx_risk_emb_document ON risk_embeddings(document_id);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_risk_emb_vector ON risk_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Risk Comparisons (precomputed diff results)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_comparisons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  prior_document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  risk_id_current     UUID REFERENCES risk_factors(id) ON DELETE CASCADE,
  risk_id_prior       UUID REFERENCES risk_factors(id) ON DELETE CASCADE,
  change_type         risk_change_type NOT NULL,
  similarity_score    REAL,                         -- Cosine similarity 0.0–1.0
  diff_summary        TEXT,                         -- Human-readable diff description
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_comp_current ON risk_comparisons(current_document_id);
CREATE INDEX IF NOT EXISTS idx_risk_comp_prior ON risk_comparisons(prior_document_id);
CREATE INDEX IF NOT EXISTS idx_risk_comp_type ON risk_comparisons(change_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Investment Memos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investment_memos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Full memo
  memo_markdown   TEXT NOT NULL,                    -- Complete rendered markdown

  -- Structured sections
  sections        JSONB NOT NULL DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "company_overview": "...",
  --   "financial_summary": "...",
  --   "bull_case": "...",
  --   "bear_case": "...",
  --   "key_risks": "...",
  --   "questions_to_investigate": "..."
  -- }

  -- Evidence references
  evidence_refs   JSONB DEFAULT '[]',
  -- [{ "section": "bull_case", "source_section": "item_7", "quote": "...", "page": 42 }]

  -- Generation metadata
  model_used      TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  generation_time_ms INTEGER,

  -- User edits
  is_edited       BOOLEAN NOT NULL DEFAULT FALSE,
  edited_markdown TEXT,                             -- User's modified version
  last_edited_at  TIMESTAMPTZ,

  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memos_document ON investment_memos(document_id);
CREATE INDEX IF NOT EXISTS idx_memos_company ON investment_memos(company_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Pipeline Runs (Audit Trail)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  step            pipeline_step NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',   -- "pending", "running", "completed", "failed"
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,

  -- Token tracking (for rate limit awareness)
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  total_tokens    INTEGER,
  model_used      TEXT,

  -- Error tracking
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,

  -- Input/output snapshots
  input_preview   TEXT,                             -- First 500 chars of input
  output_preview  TEXT,                             -- First 500 chars of output

  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_document ON pipeline_runs(document_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_step ON pipeline_runs(step);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_timing ON pipeline_runs(document_id, step, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. Helper Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Function: match tone embeddings by cosine similarity
CREATE OR REPLACE FUNCTION match_tone_embeddings(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  tone_analysis_id UUID,
  document_id UUID,
  section_key TEXT,
  passage_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.tone_analysis_id,
    te.document_id,
    te.section_key,
    te.passage_text,
    1 - (te.embedding <=> query_embedding) AS similarity
  FROM tone_embeddings te
  WHERE
    (filter_document_id IS NULL OR te.document_id = filter_document_id)
    AND 1 - (te.embedding <=> query_embedding) > match_threshold
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: match risk embeddings by cosine similarity
CREATE OR REPLACE FUNCTION match_risk_embeddings(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  risk_factor_id UUID,
  document_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    re.id,
    re.risk_factor_id,
    re.document_id,
    1 - (re.embedding <=> query_embedding) AS similarity
  FROM risk_embeddings re
  WHERE
    (filter_document_id IS NULL OR re.document_id = filter_document_id)
    AND 1 - (re.embedding <=> query_embedding) > match_threshold
  ORDER BY re.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tr_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_metrics_updated_at
  BEFORE UPDATE ON financial_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_benchmarks_updated_at
  BEFORE UPDATE ON competitor_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_memos_updated_at
  BEFORE UPDATE ON investment_memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
-- For now, enabling RLS with permissive policies.
-- In production, lock these down to authenticated users only.

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tone_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Permissive read policies (all authenticated + anon for dev)
CREATE POLICY "Allow public read" ON companies FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON document_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON financial_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON competitor_benchmarks FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON tone_analyses FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON tone_embeddings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON risk_factors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON risk_embeddings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON risk_comparisons FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON investment_memos FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON pipeline_runs FOR SELECT USING (true);

-- Service role has full access via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
-- Insert/Update/Delete for pipeline operations use the admin client

-- ═══════════════════════════════════════════════════════════════════════════════
-- Schema complete. Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════
