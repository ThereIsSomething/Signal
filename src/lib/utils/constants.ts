// ═══════════════════════════════════════════════════════════════════════════════
// Constants — SEC Section Headers, Enums, Config
// ═══════════════════════════════════════════════════════════════════════════════

import type { PipelineStep } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// SEC Filing Section Headers (Deterministic Document Sectioning)
// Used to split parsed Markdown by standardized headers.
// ─────────────────────────────────────────────────────────────────────────────

export const SEC_SECTION_HEADERS: Record<string, { key: string; order: number }> = {
  // 10-K Sections
  "Part I": { key: "part_i", order: 1 },
  "Item 1. Business": { key: "item_1", order: 2 },
  "Item 1A. Risk Factors": { key: "item_1a", order: 3 },
  "Item 1B. Unresolved Staff Comments": { key: "item_1b", order: 4 },
  "Item 1C. Cybersecurity": { key: "item_1c", order: 5 },
  "Item 2. Properties": { key: "item_2", order: 6 },
  "Item 3. Legal Proceedings": { key: "item_3", order: 7 },
  "Item 4. Mine Safety Disclosures": { key: "item_4", order: 8 },
  "Part II": { key: "part_ii", order: 9 },
  "Item 5. Market for Registrant's Common Equity": { key: "item_5", order: 10 },
  "Item 6. [Reserved]": { key: "item_6", order: 11 },
  "Item 7. Management's Discussion and Analysis": { key: "item_7", order: 12 },
  "Item 7A. Quantitative and Qualitative Disclosures About Market Risk": { key: "item_7a", order: 13 },
  "Item 8. Financial Statements and Supplementary Data": { key: "item_8", order: 14 },
  "Item 9. Changes in and Disagreements with Accountants": { key: "item_9", order: 15 },
  "Item 9A. Controls and Procedures": { key: "item_9a", order: 16 },
  "Item 9B. Other Information": { key: "item_9b", order: 17 },
  "Part III": { key: "part_iii", order: 18 },
  "Item 10. Directors, Executive Officers and Corporate Governance": { key: "item_10", order: 19 },
  "Item 11. Executive Compensation": { key: "item_11", order: 20 },
  "Item 12. Security Ownership": { key: "item_12", order: 21 },
  "Item 13. Certain Relationships and Related Transactions": { key: "item_13", order: 22 },
  "Item 14. Principal Accountant Fees and Services": { key: "item_14", order: 23 },
  "Part IV": { key: "part_iv", order: 24 },
  "Item 15. Exhibits, Financial Statement Schedules": { key: "item_15", order: 25 },
  "Item 16. Form 10-K Summary": { key: "item_16", order: 26 },
};

// Regex patterns for flexible matching (filings aren't always perfectly formatted)
export const SEC_SECTION_PATTERNS = [
  { pattern: /item\s*1a[\.\s]*risk\s*factors/i, key: "item_1a", title: "Item 1A. Risk Factors" },
  { pattern: /item\s*1[\.\s]*business/i, key: "item_1", title: "Item 1. Business" },
  { pattern: /item\s*7[\.\s]*management'?s?\s*discussion/i, key: "item_7", title: "Item 7. Management's Discussion and Analysis" },
  { pattern: /item\s*7a[\.\s]*quantitative/i, key: "item_7a", title: "Item 7A. Market Risk Disclosures" },
  { pattern: /item\s*8[\.\s]*financial\s*statements/i, key: "item_8", title: "Item 8. Financial Statements" },
  { pattern: /item\s*2[\.\s]*properties/i, key: "item_2", title: "Item 2. Properties" },
  { pattern: /item\s*3[\.\s]*legal\s*proceedings/i, key: "item_3", title: "Item 3. Legal Proceedings" },
  { pattern: /item\s*5[\.\s]*market/i, key: "item_5", title: "Item 5. Market for Common Equity" },
  { pattern: /item\s*9a[\.\s]*controls/i, key: "item_9a", title: "Item 9A. Controls and Procedures" },
  { pattern: /item\s*1c[\.\s]*cybersecurity/i, key: "item_1c", title: "Item 1C. Cybersecurity" },
];

// Earnings transcript sections
export const EARNINGS_SECTIONS = [
  { pattern: /prepared\s*remarks/i, key: "prepared_remarks", title: "Prepared Remarks" },
  { pattern: /opening\s*remarks/i, key: "opening_remarks", title: "Opening Remarks" },
  { pattern: /q\s*(?:&|and)\s*a/i, key: "qa_session", title: "Q&A Session" },
  { pattern: /question[\s-]*and[\s-]*answer/i, key: "qa_session", title: "Q&A Session" },
  { pattern: /financial\s*(?:results|highlights)/i, key: "financial_highlights", title: "Financial Highlights" },
  { pattern: /guidance|outlook/i, key: "guidance", title: "Guidance / Outlook" },
  { pattern: /closing\s*remarks/i, key: "closing_remarks", title: "Closing Remarks" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Risk Categories
// ─────────────────────────────────────────────────────────────────────────────

export const RISK_CATEGORIES = [
  "regulatory",
  "market",
  "operational",
  "financial",
  "legal",
  "cyber",
  "macro",
  "competitive",
  "supply_chain",
  "geopolitical",
  "environmental",
  "reputational",
  "technology",
  "talent",
  "other",
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const PIPELINE_STEPS_ORDER: PipelineStep[] = [
  "parse",
  "section",
  "extract_metrics",
  "analyze_tone",
  "extract_risks",
  "compare_risks",
  "generate_embeddings",
  "generate_memo",
];

export const PIPELINE_STEP_LABELS: Record<PipelineStep, string> = {
  parse: "Parsing Document",
  section: "Splitting Sections",
  extract_metrics: "Extracting Financials",
  analyze_tone: "Analyzing Tone",
  extract_risks: "Extracting Risks",
  compare_risks: "Comparing Risks",
  generate_embeddings: "Generating Embeddings",
  generate_memo: "Generating Memo",
};

// ─────────────────────────────────────────────────────────────────────────────
// Financial Metric Labels (for grid display)
// ─────────────────────────────────────────────────────────────────────────────

export const METRIC_LABELS: Record<string, string> = {
  revenue: "Revenue",
  cost_of_revenue: "Cost of Revenue",
  gross_profit: "Gross Profit",
  gross_margin: "Gross Margin",
  operating_income: "Operating Income",
  operating_margin: "Operating Margin",
  net_income: "Net Income",
  net_margin: "Net Margin",
  ebitda: "EBITDA",
  ebitda_margin: "EBITDA Margin",
  operating_cash_flow: "Operating Cash Flow",
  free_cash_flow: "Free Cash Flow",
  capex: "Capital Expenditure",
  total_debt: "Total Debt",
  net_debt: "Net Debt",
  cash_and_equivalents: "Cash & Equivalents",
  eps_basic: "EPS (Basic)",
  eps_diluted: "EPS (Diluted)",
  shares_outstanding: "Shares Outstanding",
  yoy_revenue_growth: "YoY Revenue Growth",
  yoy_net_income_growth: "YoY Net Income Growth",
};

// ─────────────────────────────────────────────────────────────────────────────
// UI Constants
// ─────────────────────────────────────────────────────────────────────────────

export const APP_NAME = "FinDoc Analyst";
export const APP_DESCRIPTION = "AI-powered financial document analysis platform";

export const NAV_ITEMS = [
  { label: "Documents", href: "/documents", icon: "FileText" },
  { label: "Benchmarks", href: "/benchmarks", icon: "BarChart3" },
] as const;

export const DOCUMENT_TAB_ITEMS = [
  { label: "Metrics", href: "metrics", icon: "TrendingUp" },
  { label: "Tone", href: "tone", icon: "MessageSquare" },
  { label: "Risks", href: "risks", icon: "AlertTriangle" },
  { label: "Memo", href: "memo", icon: "FileEdit" },
] as const;
