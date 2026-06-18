"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Loader2, FlaskConical } from "lucide-react";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

interface TestSuite {
  name: string;
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

interface TestResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: string;
    timestamp: string;
  };
  suites: TestSuite[];
}

export default function TestsPage() {
  const [data, setData] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/test");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <AppShell
      title="Test Suite"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={runTests}
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Re-run Tests
        </Button>
      }
    >
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Summary Card */}
        {data && (
          <div className="grid grid-cols-4 gap-3">
            <Card padding="md">
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                Total Tests
              </p>
              <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                {data.summary.total}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                Passed
              </p>
              <p className="text-2xl font-bold text-accent-emerald mt-1 tabular-nums">
                {data.summary.passed}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                Failed
              </p>
              <p className="text-2xl font-bold text-accent-red mt-1 tabular-nums">
                {data.summary.failed}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                Pass Rate
              </p>
              <p className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                {data.summary.passRate}
              </p>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-accent-blue animate-spin mb-3" />
            <p className="text-sm text-text-tertiary">Running test suite...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card padding="md">
            <div className="flex items-center gap-2 text-accent-red">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error running tests: {error}</span>
            </div>
          </Card>
        )}

        {/* Test Suites */}
        {data?.suites.map((suite) => (
          <Card key={suite.name} padding="none">
            {/* Suite Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-text-tertiary" />
                <span className="text-[13px] font-semibold text-text-secondary">
                  {suite.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={suite.failed === 0 ? "success" : "danger"}>
                  {suite.passed}/{suite.total} passed
                </Badge>
              </div>
            </div>

            {/* Test Results */}
            <div className="divide-y divide-border-subtle">
              {suite.results.map((test, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-4 py-2.5 ${
                    test.passed ? "" : "bg-accent-red-muted/50"
                  }`}
                >
                  {test.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-accent-emerald shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-accent-red shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-secondary">
                      {test.name}
                    </p>
                    <p className="text-[12px] text-text-tertiary font-mono mt-0.5 truncate">
                      {test.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {/* Timestamp */}
        {data && (
          <p className="text-[11px] text-text-primary0 text-center">
            Last run: {new Date(data.summary.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </AppShell>
  );
}
