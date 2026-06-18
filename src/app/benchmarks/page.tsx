"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { SkeletonTable } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";
import type { MetricValue } from "@/lib/utils/types";

interface BenchmarkRow {
  id: string;
  company_name: string;
  company_ticker: string;
  fiscal_year: number;
  metrics: Record<string, MetricValue>;
}

const BENCHMARK_COLUMNS = [
  { key: "revenue", label: "Revenue" },
  { key: "gross_margin", label: "Gross Margin" },
  { key: "operating_margin", label: "Op. Margin" },
  { key: "net_margin", label: "Net Margin" },
  { key: "revenue_growth_yoy", label: "Rev. Growth" },
  { key: "roic", label: "ROIC" },
  { key: "net_debt_to_ebitda", label: "Net Debt/EBITDA" },
  { key: "capex_to_revenue", label: "CapEx/Rev" },
];

export default function BenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBenchmarks() {
      const { data } = await supabase
        .from("competitor_benchmarks")
        .select("*, companies(name, ticker)")
        .order("benchmark_group")
        .order("fiscal_year", { ascending: false });

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: BenchmarkRow[] = data.map((row: any) => ({
          id: row.id,
          company_name: row.companies?.name || "Unknown",
          company_ticker: row.companies?.ticker || "—",
          fiscal_year: row.fiscal_year,
          metrics: row.metrics || {},
        }));
        setBenchmarks(mapped);
      }
      setLoading(false);
    }
    fetchBenchmarks();
  }, [supabase]);

  const formatCell = (val: MetricValue | undefined, key: string) => {
    if (!val || val.value === null) return "—";
    if (val.unit === "pct") return formatPercent(val.value);
    if (val.unit === "USD" || val.unit === "USD_M" || val.unit === "USD_B") {
      const multiplier = val.unit === "USD_B" ? 1e9 : val.unit === "USD_M" ? 1e6 : 1;
      return formatCurrency(val.value * multiplier);
    }
    if (val.unit === "x") return `${val.value.toFixed(1)}x`;
    return val.value.toLocaleString();
  };

  return (
    <AppShell title="Competitor Benchmarking">
      <div className="p-6 space-y-4 max-w-7xl">
        <CardHeader
          title="Competitive Analysis"
          description="Compare key financial metrics across companies"
        />

        {loading ? (
          <SkeletonTable rows={6} cols={9} />
        ) : benchmarks.length === 0 ? (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-text-secondary">
                No benchmark data yet
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Benchmark data is populated when multiple companies are analyzed
              </p>
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border-default shadow-sm bg-surface-primary">
            <table className="data-grid">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface-primary z-20 w-[160px] border-r border-border-default">Company</th>
                  <th className="text-right w-[60px]">Year</th>
                  {BENCHMARK_COLUMNS.map((col) => (
                    <th key={col.key} className="text-right">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((row) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 bg-surface-secondary z-10 border-r border-border-default">
                      <span className="font-semibold text-text-primary">
                        {row.company_ticker}
                      </span>
                      <span className="text-text-tertiary ml-1.5 text-[12px]">
                        {row.company_name}
                      </span>
                    </td>
                    <td className="text-right tabular-nums text-text-secondary">
                      {row.fiscal_year}
                    </td>
                    {BENCHMARK_COLUMNS.map((col) => (
                      <td key={col.key} className="metric-value">
                        {formatCell(row.metrics[col.key], col.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
