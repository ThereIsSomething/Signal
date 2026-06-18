# Changelog — AI Financial Document Analyst

All notable changes to this project are documented here with date, time, and context.

---

## [2026-06-18T15:30:00+05:30] — Phase 1: Foundation Scaffold

### Context
Initial project setup for the AI Financial Document Analyst platform. This is a term-end project for GenAI coursework.

### Changes
- **Project Initialization**: Created Next.js 14 project with App Router, TypeScript, Tailwind CSS, ESLint
- **Database Schema**: Complete Supabase SQL schema with 12 tables:
  - `companies`, `documents`, `document_sections`
  - `financial_metrics`, `competitor_benchmarks`
  - `tone_analyses`, `tone_embeddings` (pgvector 1024d)
  - `risk_factors`, `risk_embeddings` (pgvector 1024d)
  - `risk_comparisons`, `investment_memos`, `pipeline_runs`
- **Extensions**: pgvector enabled with HNSW indexes for cosine similarity
- **Enums**: `filing_type`, `document_status`, `pipeline_step`, `risk_change_type`, `risk_severity`, `metric_period_type`
- **Helper Functions**: `match_tone_embeddings()`, `match_risk_embeddings()`, `update_updated_at_column()`
- **RLS Policies**: Permissive read for all tables, writes via service role
- **Environment**: Complete `.env.local` with Supabase, Nvidia NIM, LlamaParse credentials
- **Supabase Clients**: Browser (`client.ts`), Server (`server.ts`), Admin (`admin.ts`)
- **Nvidia NIM Client**: OpenAI-compatible wrapper for `meta/llama-3.3-70b-instruct`
- **Rate Limiter**: Sequential queue enforcing 40 RPM with sliding window
- **LLM Prompts**: 4 structured prompt templates (metrics, tone, risks, memo)
- **Section Splitter**: Deterministic SEC header parsing (no RAG)
- **LlamaParse Client**: PDF-to-Markdown conversion via REST API
- **Pipeline Orchestrator**: Sequential 7-step pipeline with audit logging
- **Type System**: Complete TypeScript types mirroring Supabase schema
- **Constants**: SEC section headers, risk categories, pipeline config
- **Formatters**: Currency/percentage/delta formatting utilities
- **Dependencies**: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-table`, `openai`, `lucide-react`, `react-dropzone`

### Tech Decisions
- **LLM Model**: `meta/llama-3.3-70b-instruct` — 128k context, strong JSON extraction
- **Embedding Model**: `nvidia/nv-embedqa-e5-v5` — 1024 dimensions
- **No RAG**: Deterministic section splitting by SEC headers
- **Rate Limiting**: All LLM calls sequential via rate limiter, frontend read-only from Supabase

---

## [2026-06-18T16:15:00+05:30] — Phase 2: UI Foundation

### Context
Built the complete UI layer: design system, base components, layout components, and all application pages.

### Changes
- **Design System** (`globals.css`): Complete Tailwind v4 theme with obsidian/zinc palette, accent colors (blue/emerald/red/amber/violet), semantic tokens for surfaces/borders/text, data-grid styles, diff viewer styles, memo canvas styles, animations (fade-in/slide-in/shimmer)
- **Fonts**: Inter (UI) + JetBrains Mono (data) via next/font/google
- **Root Layout**: Updated with Inter/JetBrains Mono variables, SEO metadata, dark background
- **Base UI Components** (6 files):
  - `components/ui/button.tsx` — 4 variants, 3 sizes, loading spinner, icon slot
  - `components/ui/badge.tsx` — 6 variants, status dot, compact sizing
  - `components/ui/card.tsx` — Configurable padding, hover state, CardHeader sub-component
  - `components/ui/tabs.tsx` — Underline indicator, icon support, useTabState hook
  - `components/ui/skeleton.tsx` — Base skeleton, text lines, card skeleton, table skeleton
- **Layout Components** (4 files):
  - `components/layout/sidebar.tsx` — Linear.app-inspired collapsible sidebar, icon-only mode
  - `components/layout/header.tsx` — Auto-generated breadcrumbs, action slot
  - `components/layout/split-pane.tsx` — Resizable drag handle, min-width constraints
  - `components/layout/app-shell.tsx` — Sidebar + Header + Main composition
- **Feature Components** (3 files):
  - `components/documents/dropzone.tsx` — PDF drag-and-drop, metadata form, validation
  - `components/documents/document-list.tsx` — Rows.com-style data-grid table
  - `components/documents/pipeline-progress.tsx` — 8-step pipeline progress indicator
- **Pages** (4 routes):
  - `/` (Dashboard) — Stat cards, quick action links, feature overview
  - `/documents` — Upload dropzone + document list with realtime status updates
  - `/documents/[id]` — 4-tab detail view (Metrics, Tone, Risks, Memo)
  - `/benchmarks` — Multi-company comparison table with sticky columns

### UI Design Inspirations
- **Linear.app**: Sidebar navigation, tab system, breadcrumbs
- **Rows.com**: Dense data grids, tabular-nums, compact spacing
- **Anthropic Console**: Memo canvas, evidence panel, split-pane layout

---

## [2026-06-18T16:35:00+05:30] — Phase 9 & 10: Testing and Polish

### Context
Completed the final phases of the project: comprehensive testing of prompt templates, utilities, and parsing logic, alongside UI polish and error handling.

### Changes
- **Test Suite** (`src/lib/tests/test-suite.ts`): Created 35 tests covering:
  - Deterministic section splitter (10-K and earnings transcripts)
  - Number formatters (currency, delta, percentage, file size)
  - Prompt generators (metrics, tone, risk, memo templates)
  - Rate Limiter queue structure
  - Application constants (SEC patterns, pipeline steps)
- **Test API** (`src/app/api/test/route.ts`): Built an API route to securely execute the test suite and aggregate pass/fail stats.
- **Visual Test Runner** (`src/app/tests/page.tsx`): Built a dedicated dashboard UI for running tests and visually tracking component-level pass/fail states with instant feedback.
- **Error Handling**: Implemented custom `app/not-found.tsx` and `app/error.tsx` (global error boundary) pages to handle edge cases gracefully with user-friendly UI.
- **Loading States**: Added global `app/loading.tsx` for route transitions.
- **Sidebar Integration**: Added "Tests" navigation item to the main AppShell sidebar.
- **Results**: Verified 100% test pass rate (35/35).
