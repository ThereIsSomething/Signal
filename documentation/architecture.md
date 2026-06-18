# Architecture — AI Financial Document Analyst

## System Overview

```
┌──────────────┐     ┌───────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Supabase DB  │◀────│  Pipeline Engine  │
│  (Next.js)   │     │  (PostgreSQL  │     │  (Server Actions)  │
│  READ-ONLY   │     │  + pgvector)  │     │  WRITE-ONLY        │
└──────────────┘     └───────────────┘     └──────────────────┘
                                                    │
                                           ┌────────┼────────┐
                                           ▼        ▼        ▼
                                     ┌──────────┐ ┌──────┐ ┌────────┐
                                     │LlamaParse│ │ NIM  │ │  NIM   │
                                     │ PDF→MD   │ │ LLM  │ │Embeds  │
                                     └──────────┘ └──────┘ └────────┘
```

## Data Flow

1. **Upload**: User drops PDF → Server Action stores file → Creates `document` row
2. **Parse**: LlamaParse converts PDF → Markdown → Stored as `raw_markdown`
3. **Section**: Deterministic splitter extracts sections by SEC headers → `document_sections`
4. **Extract**: LLM extracts financial metrics → `financial_metrics`
5. **Tone**: LLM analyzes management tone → `tone_analyses` + `tone_embeddings`
6. **Risks**: LLM extracts risk factors → `risk_factors` + `risk_embeddings`
7. **Compare**: pgvector cosine similarity matches risks across periods → `risk_comparisons`
8. **Memo**: LLM generates investment memo → `investment_memos`
9. **Display**: Frontend reads all results from Supabase → Renders UI

## Key Architectural Constraints

### NO RAG
Documents are NOT chunked into vectors for retrieval. Instead:
- Parsed Markdown is split by standardized SEC headers (Item 1A, Item 7, etc.)
- Complete sections are passed to the LLM for extraction
- pgvector is used ONLY for localized semantic diffing (tone/risk comparison across periods)

### Rate Limiting (40 RPM)
- All LLM calls go through a sequential queue (`rate-limiter.ts`)
- Pipeline steps execute one at a time
- Frontend NEVER calls LLM directly — reads pre-computed results from Supabase

### Database as Source of Truth
- Supabase PostgreSQL stores all structured data
- JSONB columns for flexible metric schemas
- pgvector for embedding-based similarity search
- RLS enabled with permissive read policies

## Directory Map

| Path | Purpose |
|:---|:---|
| `src/lib/supabase/` | Supabase client utilities (browser, server, admin) |
| `src/lib/nim/` | Nvidia NIM client, rate limiter, LLM prompts |
| `src/lib/parser/` | LlamaParse wrapper, section splitter |
| `src/lib/pipeline/` | Sequential pipeline orchestrator |
| `src/lib/utils/` | Types, constants, formatters |
| `src/app/` | Next.js App Router pages and API routes |
| `src/components/` | React components by feature module |
| `src/actions/` | Next.js Server Actions |
| `src/hooks/` | Client-side React hooks |
| `supabase/` | SQL schema and migrations |
| `documentation/` | Changelog, architecture, tasks, metadata |
