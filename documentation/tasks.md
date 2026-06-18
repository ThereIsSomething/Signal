# Tasks — AI Financial Document Analyst

## Phase 1: Foundation (Schema + Structure + Environment)
- [x] Initialize Next.js 14 with App Router, TypeScript, Tailwind
- [x] Install core dependencies
- [x] Create `.env.local` with all credentials
- [x] Create complete Supabase SQL schema (12 tables, pgvector, enums)
- [x] Create Supabase client utilities (browser, server, admin)
- [x] Create Nvidia NIM client (OpenAI-compatible)
- [x] Create rate limiter (40 RPM sequential queue)
- [x] Create LLM prompt templates (metrics, tone, risks, memo)
- [x] Create LlamaParse client wrapper
- [x] Create deterministic section splitter
- [x] Create pipeline orchestrator
- [x] Create TypeScript type definitions
- [x] Create constants (SEC headers, risk categories)
- [x] Create financial formatters
- [x] Create documentation system (changelog, architecture, tasks, metadata)
- [ ] Deploy schema to Supabase (user must run in SQL Editor)

## Phase 2: UI Foundation (Design System + Layout) ✅ COMPLETE
- [x] Set up Tailwind v4 custom theme (obsidian/zinc palette, accent colors)
- [x] Create base UI components (button, badge, card, tabs, skeleton)
- [x] Create layout components (sidebar, header, split-pane, app-shell)
- [x] Set up Inter + JetBrains Mono fonts via next/font
- [x] Create root layout with SEO metadata
- [x] Create dashboard landing page

## Phase 3: Document Ingestion ✅ COMPLETE
- [x] Create PDF dropzone component (react-dropzone with metadata form)
- [x] Create document list view (data-grid table with status badges)
- [x] Create document upload Server Action
- [x] Create parse API route (/api/parse)
- [x] Create document status/progress indicator (pipeline-progress.tsx)
- [x] Wire up pipeline trigger on upload

## Phase 4: Financial Metrics Display ✅ COMPLETE
- [x] Create dense data grid (Rows.com-style table)
- [x] Create metric cell component (formatMetricValue, unit-aware)
- [x] Create document detail page with metrics tab
- [x] Wire up Supabase data fetching

## Phase 5: Tone Analysis ✅ COMPLETE
- [x] Create tone panel (sentiment/confidence/hedging score bars)
- [x] Create key phrases display with type-aware badges
- [x] Wire up tone data from Supabase in document detail

## Phase 6: Risk Factor Viewer ✅ COMPLETE
- [x] Create risk list with diff-style indicators (diff-added, diff-changed)
- [x] Create split-pane layout (risk list left, detail right)
- [x] Flag new/escalated risks with visual badges

## Phase 7: Competitor Benchmarking ✅ COMPLETE
- [x] Create multi-company comparison grid (sticky first column)
- [x] Create benchmarks page at /benchmarks

## Phase 8: Investment Memo ✅ COMPLETE
- [x] Create memo canvas (Anthropic Console-style markdown rendering)
- [x] Create evidence panel (left: source section references)
- [x] Create split-pane layout for memo view

## Phase 9: Testing ✅ COMPLETE
- [x] Metric extraction accuracy test
- [x] Tone analysis detection test (cautious vs confident)
- [x] Risk comparison flagging test (new risk in year 2)
- [x] Benchmark accuracy test (cross-company)
- [x] Memo validation test (bull + bear cases)
- [x] Create test runner UI at `/tests`

## Phase 10: Polish & Production ✅ COMPLETE
- [x] Performance optimization
- [x] Error handling and edge cases (404 and global error boundary)
- [x] Responsive design verification
- [x] SEO meta tags (added in root layout)
- [x] Custom scrollbars, animations, transitions
