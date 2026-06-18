# Metadata — AI Financial Document Analyst

> This file serves as a reference for AI models to understand the project state.
> Last updated: 2026-06-18T15:30:00+05:30

## Project Identity

| Field | Value |
|:---|:---|
| **Project Name** | AI Financial Document Analyst (FinDoc Analyst) |
| **Type** | Term-end GenAI project |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict) |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **LLM Provider** | Nvidia NIM API |
| **LLM Model** | `meta/llama-3.3-70b-instruct` |
| **Embedding Model** | `nvidia/nv-embedqa-e5-v5` (1024d) |
| **PDF Parser** | LlamaParse (LlamaCloud REST API) |
| **Styling** | Tailwind CSS v3 |
| **Icons** | Lucide React |
| **Data Grid** | @tanstack/react-table |

## What Has Been Done (Phase 1 Complete)

### Infrastructure
- Next.js 14 project initialized with App Router + TypeScript + Tailwind + ESLint
- All dependencies installed
- `.env.local` configured with Supabase, Nvidia NIM, LlamaParse credentials

### Database
- Complete SQL schema: 12 tables, 6 enums, pgvector extension
- HNSW indexes on embedding columns
- RPC functions for similarity search
- Auto-update triggers on `updated_at` columns
- RLS policies (permissive read, service role write)
- **Schema NOT yet deployed** — must run `supabase/schema.sql` in Supabase SQL Editor

### Backend/Library Code
- `src/lib/supabase/`: 3 clients (browser, server, admin)
- `src/lib/nim/client.ts`: Nvidia NIM wrapper using OpenAI SDK
- `src/lib/nim/rate-limiter.ts`: 40 RPM sequential queue
- `src/lib/nim/prompts/`: 4 prompt templates
- `src/lib/parser/llamaparse.ts`: PDF → Markdown conversion
- `src/lib/parser/section-splitter.ts`: Deterministic SEC header splitting
- `src/lib/pipeline/orchestrator.ts`: Full sequential pipeline
- `src/lib/utils/types.ts`: Complete TypeScript type system
- `src/lib/utils/constants.ts`: SEC headers, risk categories, UI config
- `src/lib/utils/formatters.ts`: Financial number formatting

### Documentation
- `documentation/changelog.md`
- `documentation/architecture.md`
- `documentation/tasks.md`
- `documentation/metadata.md` (this file)

## What Is Being Done
- Nothing currently in progress

## What Needs To Be Done

### Phase 2: UI Foundation
- Custom Tailwind theme (obsidian/zinc palette inspired by Linear.app)
- Base UI components (button, badge, card, etc.)
- Layout components (sidebar, header, split-pane)
- Root layout with Inter font and providers
- Dashboard landing page

### Phase 3–8: Feature Implementation
See `documentation/tasks.md` for full breakdown.

### Phase 9: Testing
- 5 specific test criteria defined in project requirements

### Phase 10: Polish
- Performance, error handling, responsive design, SEO

## File Index

| File | Purpose | Status |
|:---|:---|:---|
| `supabase/schema.sql` | Database schema | ✅ Created, ⏳ Not deployed |
| `.env.local` | Environment variables | ✅ Complete |
| `src/lib/supabase/client.ts` | Browser Supabase client | ✅ Complete |
| `src/lib/supabase/server.ts` | Server Supabase client | ✅ Complete |
| `src/lib/supabase/admin.ts` | Admin Supabase client | ✅ Complete |
| `src/lib/nim/client.ts` | Nvidia NIM wrapper | ✅ Complete |
| `src/lib/nim/rate-limiter.ts` | 40 RPM rate limiter | ✅ Complete |
| `src/lib/nim/prompts/extract-metrics.ts` | Metric extraction prompt | ✅ Complete |
| `src/lib/nim/prompts/analyze-tone.ts` | Tone analysis prompt | ✅ Complete |
| `src/lib/nim/prompts/extract-risks.ts` | Risk extraction prompt | ✅ Complete |
| `src/lib/nim/prompts/generate-memo.ts` | Memo generation prompt | ✅ Complete |
| `src/lib/parser/llamaparse.ts` | LlamaParse client | ✅ Complete |
| `src/lib/parser/section-splitter.ts` | SEC section splitter | ✅ Complete |
| `src/lib/pipeline/orchestrator.ts` | Pipeline orchestrator | ✅ Complete |
| `src/lib/utils/types.ts` | TypeScript types | ✅ Complete |
| `src/lib/utils/constants.ts` | Constants & config | ✅ Complete |
| `src/lib/utils/formatters.ts` | Number formatters | ✅ Complete |

## Key Design Decisions

1. **No RAG**: Deterministic section splitting by SEC headers instead of vector chunking
2. **Sequential Pipeline**: 40 RPM rate limit enforced — all LLM calls go through queue
3. **Frontend Read-Only**: UI never calls LLM directly — reads pre-computed results from Supabase
4. **JSONB Metrics**: Flexible schema for different filing types via JSONB columns
5. **pgvector for Diffing Only**: Embeddings used for tone/risk comparison across periods, not retrieval
6. **Service Role for Writes**: Pipeline writes bypass RLS via `SUPABASE_SERVICE_ROLE_KEY`
