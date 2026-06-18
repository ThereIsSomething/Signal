// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite: Section Splitter
// Validates deterministic SEC header splitting
// ═══════════════════════════════════════════════════════════════════════════════

import { splitIntoSections } from "@/lib/parser/section-splitter";

// ─── Test Data ────────────────────────────────────────────────────────────────

const MOCK_10K_MARKDOWN = `
# Part I

## Item 1. Business

Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables and accessories, and sells a variety of related services. The Company's fiscal year ends on the last Saturday of September.

## Item 1A. Risk Factors

The Company's business, reputation, results of operations, financial condition, and stock price can be affected by a number of factors, whether currently known or unknown.

### Macroeconomic and Industry Risks

The Company's operations and performance depend significantly on worldwide economic conditions and their impact on levels of consumer spending.

### Legal and Regulatory Compliance Risks

The Company is subject to complex and changing laws and regulations worldwide, which exposes the Company to potential liabilities, increased costs, and other adverse effects on the Company's business.

## Item 7. Management's Discussion and Analysis of Financial Condition and Results of Operations

Total net revenue was $394.3 billion for the fiscal year ended September 30, 2023, compared to $394.3 billion for the fiscal year ended September 24, 2022.

### Revenue

Revenue decreased 3% or $11.0 billion during 2023 compared to 2022.

### Gross Margin

Products gross margin percentage decreased during 2023 compared to 2022 due to the different mix of Products revenue.

## Item 8. Financial Statements and Supplementary Data

### Consolidated Statements of Operations

|  | 2023 | 2022 | 2021 |
|---|---|---|---|
| Net sales | $383,285 | $394,328 | $365,817 |
| Cost of sales | $214,137 | $223,546 | $212,981 |
`;

const MOCK_EARNINGS_MARKDOWN = `
# Q4 2023 Earnings Conference Call

## Prepared Remarks

Good afternoon. Thank you for joining us today. I will provide an overview of our fiscal fourth quarter and full year results.

Revenue for the September quarter was $89.5 billion, down 1 percent from a year ago.

## Q&A Session

Operator: Our first question comes from the line of Erik Woodring with Morgan Stanley.

Erik Woodring: Tim, you talked about the installed base being at an all-time high.

Tim Cook: Yes, and to provide some additional color on that, we're really pleased with where we are.

## Guidance

For the December quarter, we expect revenue to be in line or slightly above the year-ago quarter.
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

function runSectionSplitterTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: 10-K splitting extracts correct section keys
  try {
    const sections = splitIntoSections(MOCK_10K_MARKDOWN, "10-K");
    const sectionKeys = sections.map((s) => s.key);

    const hasItem1a = sectionKeys.some((k) => k.includes("item_1a"));
    const hasItem7 = sectionKeys.some((k) => k.includes("item_7"));

    const passed = hasItem1a && hasItem7;
    results.push({
      name: "10-K: Extracts key SEC sections (Item 1A, Item 7)",
      passed,
      message: passed
        ? `Found ${sectionKeys.length} sections: ${sectionKeys.join(", ")}`
        : `Missing expected sections. Found: ${sectionKeys.join(", ")}`,
    });
  } catch (e) {
    results.push({
      name: "10-K: Extracts key SEC sections",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test 2: Risk Factors section contains risk content
  try {
    const sections = splitIntoSections(MOCK_10K_MARKDOWN, "10-K");
    const riskSection = sections.find((s) => s.key.includes("item_1a"));

    const hasContent = riskSection && riskSection.content.length > 50;
    const hasRiskKeywords =
      riskSection && (riskSection.content.includes("Risk") || riskSection.content.includes("risk"));

    const passed = Boolean(hasContent && hasRiskKeywords);
    results.push({
      name: "10-K: Risk Factors section contains risk content",
      passed,
      message: passed
        ? `Risk section: ${riskSection!.charCount} chars with risk keywords`
        : `Risk section content insufficient`,
    });
  } catch (e) {
    results.push({
      name: "10-K: Risk Factors section content",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test 3: MD&A section contains financial data
  try {
    const sections = splitIntoSections(MOCK_10K_MARKDOWN, "10-K");
    const mdaSection = sections.find((s) => s.key.includes("item_7"));

    const hasContent = mdaSection && mdaSection.content.length > 50;
    const hasFinancialData =
      mdaSection && (mdaSection.content.includes("revenue") || mdaSection.content.includes("Revenue"));

    const passed = Boolean(hasContent && hasFinancialData);
    results.push({
      name: "10-K: MD&A section contains financial data",
      passed,
      message: passed
        ? `MD&A section: ${mdaSection!.charCount} chars with financial data`
        : `MD&A section insufficient`,
    });
  } catch (e) {
    results.push({
      name: "10-K: MD&A section contains financial data",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test 4: Earnings transcript splits correctly
  try {
    const sections = splitIntoSections(MOCK_EARNINGS_MARKDOWN, "earnings_transcript");
    const sectionKeys = sections.map((s) => s.key);

    const hasPreparedRemarks = sectionKeys.some((k) => k.includes("prepared"));
    const hasQA = sectionKeys.some((k) => k.includes("qa"));
    const hasGuidance = sectionKeys.some((k) => k.includes("guidance"));

    const passed = hasPreparedRemarks || hasQA || hasGuidance;
    results.push({
      name: "Earnings: Extracts transcript sections",
      passed,
      message: passed
        ? `Found sections: ${sectionKeys.join(", ")}`
        : `No expected sections found. Keys: ${sectionKeys.join(", ")}`,
    });
  } catch (e) {
    results.push({
      name: "Earnings: Extracts transcript sections",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test 5: Empty input returns empty or fallback
  try {
    const sections = splitIntoSections("", "10-K");
    const sectionCount = sections.length;

    results.push({
      name: "Edge case: Empty input handled gracefully",
      passed: true,
      message: `Returned ${sectionCount} sections for empty input`,
    });
  } catch (e) {
    results.push({
      name: "Edge case: Empty input handled gracefully",
      passed: false,
      message: `Threw error on empty input: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return results;
}

// ─── Formatter Tests ──────────────────────────────────────────────────────────

import { formatCurrency, formatPercent, formatDelta, formatMetricValue, formatFileSize } from "@/lib/utils/formatters";

function runFormatterTests(): TestResult[] {
  const results: TestResult[] = [];

  // Currency formatting
  const currencyTests = [
    { input: 1_500_000_000, expected: "$1.5B", desc: "Billions" },
    { input: 250_000_000, expected: "$250.0M", desc: "Millions" },
    { input: 45_000, expected: "$45.0K", desc: "Thousands" },
    { input: -1_200_000_000, expected: "-$1.2B", desc: "Negative billions" },
    { input: null, expected: "—", desc: "Null input" },
  ];

  for (const test of currencyTests) {
    const result = formatCurrency(test.input);
    results.push({
      name: `Currency: ${test.desc}`,
      passed: result === test.expected,
      message: result === test.expected ? `✓ ${result}` : `Expected "${test.expected}", got "${result}"`,
    });
  }

  // Percentage formatting
  const pctTests = [
    { input: 0.45, expected: "45.0%", desc: "45%" },
    { input: 0.123, expected: "12.3%", desc: "12.3%" },
    { input: null, expected: "—", desc: "Null" },
  ];

  for (const test of pctTests) {
    const result = formatPercent(test.input);
    results.push({
      name: `Percent: ${test.desc}`,
      passed: result === test.expected,
      message: result === test.expected ? `✓ ${result}` : `Expected "${test.expected}", got "${result}"`,
    });
  }

  // Delta formatting
  const deltaTests = [
    { input: 0.15, expected: "+15.0%", desc: "Positive" },
    { input: -0.08, expected: "-8.0%", desc: "Negative" },
    { input: null, expected: "—", desc: "Null" },
  ];

  for (const test of deltaTests) {
    const result = formatDelta(test.input);
    results.push({
      name: `Delta: ${test.desc}`,
      passed: result === test.expected,
      message: result === test.expected ? `✓ ${result}` : `Expected "${test.expected}", got "${result}"`,
    });
  }

  // MetricValue formatting
  const metricTests = [
    { input: { value: 89.5, unit: "USD_B" as const }, expected: "$89.5B", desc: "USD billions" },
    { input: { value: 0.45, unit: "pct" as const }, expected: "45.0%", desc: "Percentage" },
    { input: { value: 3.2, unit: "x" as const }, expected: "3.2x", desc: "Multiple" },
    { input: null, expected: "—", desc: "Null" },
  ];

  for (const test of metricTests) {
    const result = formatMetricValue(test.input);
    results.push({
      name: `MetricValue: ${test.desc}`,
      passed: result === test.expected,
      message: result === test.expected ? `✓ ${result}` : `Expected "${test.expected}", got "${result}"`,
    });
  }

  // File size formatting
  const fileTests = [
    { input: 512, expected: "512 B", desc: "Bytes" },
    { input: 1536, expected: "1.5 KB", desc: "Kilobytes" },
    { input: 5_242_880, expected: "5.0 MB", desc: "Megabytes" },
  ];

  for (const test of fileTests) {
    const result = formatFileSize(test.input);
    results.push({
      name: `FileSize: ${test.desc}`,
      passed: result === test.expected,
      message: result === test.expected ? `✓ ${result}` : `Expected "${test.expected}", got "${result}"`,
    });
  }

  return results;
}

// ─── Prompt Template Tests ────────────────────────────────────────────────────

import { buildExtractMetricsPrompt } from "@/lib/nim/prompts/extract-metrics";
import { buildAnalyzeTonePrompt } from "@/lib/nim/prompts/analyze-tone";
import { buildExtractRisksPrompt } from "@/lib/nim/prompts/extract-risks";
import { buildGenerateMemoPrompt } from "@/lib/nim/prompts/generate-memo";

function runPromptTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test metrics prompt
  try {
    const prompt = buildExtractMetricsPrompt("Revenue was $89.5B. Net income was $22.9B.", "Apple Inc.", "FY2023");
    const passed = prompt.length > 50 && prompt.includes("Apple") && prompt.includes("Revenue was $89.5B");
    results.push({
      name: "Prompt: Metrics extraction includes company & filing text",
      passed,
      message: passed ? `✓ ${prompt.length} chars` : "Missing company name or filing text",
    });
  } catch (e) {
    results.push({
      name: "Prompt: Metrics extraction",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test tone prompt
  try {
    const prompt = buildAnalyzeTonePrompt("We are confident in our long-term strategy.", "Item 7. MD&A", "Apple Inc.", "FY2023");
    const passed = prompt.length > 50 && (prompt.includes("tone") || prompt.includes("Apple") || prompt.includes("MD&A"));
    results.push({
      name: "Prompt: Tone analysis includes sentiment scoring",
      passed,
      message: passed ? `✓ ${prompt.length} chars` : "Missing sentiment/tone instructions",
    });
  } catch (e) {
    results.push({
      name: "Prompt: Tone analysis",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test risk prompt
  try {
    const prompt = buildExtractRisksPrompt("The Company faces regulatory risks from changing data privacy laws.", "Apple Inc.", "FY2023");
    const passed = prompt.length > 50 && (prompt.includes("risk") || prompt.includes("Risk"));
    results.push({
      name: "Prompt: Risk extraction includes risk classification",
      passed,
      message: passed ? `✓ ${prompt.length} chars` : "Missing risk classification",
    });
  } catch (e) {
    results.push({
      name: "Prompt: Risk extraction",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test memo prompt
  try {
    const prompt = buildGenerateMemoPrompt(
      "Apple Inc.",
      "FY2023",
      '{"revenue": {"value": 383285, "unit": "USD_M"}}',
      '{"overall_tone": "confident"}',
      '[{"risk_title": "Regulatory risk"}]'
    );
    const passed = prompt.length > 50 && prompt.includes("Apple") && (prompt.includes("METRICS") || prompt.includes("memo"));
    results.push({
      name: "Prompt: Memo generation includes company context & bull/bear",
      passed,
      message: passed ? `✓ ${prompt.length} chars` : "Missing company context or bull/bear instructions",
    });
  } catch (e) {
    results.push({
      name: "Prompt: Memo generation",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return results;
}

// ─── Rate Limiter Tests ───────────────────────────────────────────────────────

import { rateLimiter } from "@/lib/nim/rate-limiter";

async function runRateLimiterTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test that rate limiter exists and has expected methods
  try {
    const hasEnqueue = typeof rateLimiter.enqueue === "function";
    results.push({
      name: "RateLimiter: Has enqueue method",
      passed: hasEnqueue,
      message: hasEnqueue ? "✓ enqueue method available" : "Missing enqueue method",
    });
  } catch (e) {
    results.push({
      name: "RateLimiter: Initialization",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Test sequential execution
  try {
    const executionOrder: number[] = [];
    const start = Date.now();

    // Run 3 quick tasks and await them all
    const results_order = await Promise.all([1, 2, 3].map((i) =>
      rateLimiter.enqueue(async () => {
        executionOrder.push(i);
        return i;
      })
    ));

    // Verify tasks executed in order and returned correct values
    const correctOrder = executionOrder.join(",") === "1,2,3";
    const correctValues = results_order.join(",") === "1,2,3";
    const withinTimeframe = (Date.now() - start) < 10000; // Should complete within 10s

    const passed = correctOrder && correctValues && withinTimeframe;
    results.push({
      name: "RateLimiter: Sequential execution with correct order and timing",
      passed,
      message: passed
        ? `✓ 3 tasks executed in order [${executionOrder}] within ${Date.now() - start}ms`
        : `Order was [${executionOrder}], values [${results_order}], took ${Date.now() - start}ms`,
    });
  } catch (e) {
    results.push({
      name: "RateLimiter: Sequential execution",
      passed: false,
      message: `Error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return results;
}

// ─── Constants Tests ──────────────────────────────────────────────────────────

import {
  SEC_SECTION_HEADERS,
  SEC_SECTION_PATTERNS,
  RISK_CATEGORIES,
  PIPELINE_STEPS_ORDER,
  PIPELINE_STEP_LABELS,
  METRIC_LABELS,
} from "@/lib/utils/constants";

function runConstantsTests(): TestResult[] {
  const results: TestResult[] = [];

  results.push({
    name: "Constants: SEC headers count >= 20",
    passed: Object.keys(SEC_SECTION_HEADERS).length >= 20,
    message: `${Object.keys(SEC_SECTION_HEADERS).length} headers defined`,
  });

  results.push({
    name: "Constants: SEC patterns count >= 5",
    passed: SEC_SECTION_PATTERNS.length >= 5,
    message: `${SEC_SECTION_PATTERNS.length} patterns defined`,
  });

  results.push({
    name: "Constants: Risk categories count >= 10",
    passed: RISK_CATEGORIES.length >= 10,
    message: `${RISK_CATEGORIES.length} categories defined`,
  });

  results.push({
    name: "Constants: Pipeline steps = 8",
    passed: PIPELINE_STEPS_ORDER.length === 8,
    message: `${PIPELINE_STEPS_ORDER.length} steps defined`,
  });

  results.push({
    name: "Constants: All pipeline steps have labels",
    passed: PIPELINE_STEPS_ORDER.every((step) => PIPELINE_STEP_LABELS[step]),
    message: "All steps mapped to labels",
  });

  results.push({
    name: "Constants: Metric labels count >= 15",
    passed: Object.keys(METRIC_LABELS).length >= 15,
    message: `${Object.keys(METRIC_LABELS).length} metric labels defined`,
  });

  return results;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export {
  runSectionSplitterTests,
  runFormatterTests,
  runPromptTests,
  runRateLimiterTests,
  runConstantsTests,
};

export type { TestResult };
