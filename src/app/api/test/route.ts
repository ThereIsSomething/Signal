// ═══════════════════════════════════════════════════════════════════════════════
// API Route: GET /api/test
// Runs the full test suite and returns results
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  runSectionSplitterTests,
  runFormatterTests,
  runPromptTests,
  runRateLimiterTests,
  runConstantsTests,
} from "@/lib/tests/test-suite";
import type { TestResult } from "@/lib/tests/test-suite";

export async function GET() {
  const suites: { name: string; results: TestResult[] }[] = [];

  // Run all test suites
  suites.push({ name: "Section Splitter", results: runSectionSplitterTests() });
  suites.push({ name: "Formatters", results: runFormatterTests() });
  suites.push({ name: "Prompt Templates", results: runPromptTests() });
  suites.push({ name: "Rate Limiter", results: await runRateLimiterTests() });
  suites.push({ name: "Constants", results: runConstantsTests() });

  // Aggregate stats
  const allResults = suites.flatMap((s) => s.results);
  const total = allResults.length;
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  return NextResponse.json({
    summary: {
      total,
      passed,
      failed,
      passRate: `${((passed / total) * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    },
    suites: suites.map((suite) => ({
      name: suite.name,
      total: suite.results.length,
      passed: suite.results.filter((r) => r.passed).length,
      failed: suite.results.filter((r) => !r.passed).length,
      results: suite.results,
    })),
  });
}
