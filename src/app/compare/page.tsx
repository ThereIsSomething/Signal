"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";
import { METRIC_LABELS } from "@/lib/utils/constants";
import { formatMetricValue } from "@/lib/utils/formatters";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ArrowLeft, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface CompareData {
  company: {
    id: string;
    name: string;
    ticker: string;
    sector: string | null;
    industry: string | null;
  };
  document: {
    id: string;
    status: string;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: any;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idsParam = searchParams.get("ids");
  const companyIds = React.useMemo(() => {
    return idsParam ? idsParam.split(",").slice(0, 3) : [];
  }, [idsParam]);

  const [data, setData] = useState<CompareData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (companyIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    async function fetchData() {
      // Fetch companies
      const { data: companies } = await supabase
        .from("companies")
        .select("*")
        .in("id", companyIds);

      if (!companies) return;

      const compareData: CompareData[] = [];

      // For each company, fetch latest document and its metrics
      for (const comp of companies) {
        const { data: doc } = await supabase
          .from("documents")
          .select("*")
          .eq("company_id", comp.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let metrics = null;
        if (doc) {
          const { data: m } = await supabase
            .from("financial_metrics")
            .select("*")
            .eq("document_id", doc.id)
            .maybeSingle();
          metrics = m;
        }

        compareData.push({
          company: comp,
          document: doc,
          metrics: metrics
        });
      }

      setData(compareData);
      setLoading(false);
    }
    fetchData();
  }, [companyIds, supabase]);

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonTable rows={10} cols={4} />
      </div>
    );
  }

  if (companyIds.length < 2) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-center">
        <BarChart2 className="h-12 w-12 text-text-tertiary mb-4" />
        <h2 className="text-lg font-medium text-text-primary">Not enough companies selected</h2>
        <p className="text-sm text-text-secondary mt-2 mb-4">Please select 2 or 3 companies to compare.</p>
        <button onClick={() => router.back()} className="text-accent-primary hover:underline text-sm">
          &larr; Back to Companies
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.map((d) => {
    const revVal = d.metrics?.revenue?.value;
    const niVal = d.metrics?.net_income?.value;
    
    // Attempt to parse string/number for charts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseNum = (val: any) => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      const num = parseFloat(String(val).replace(/[^0-9.-]+/g,""));
      return isNaN(num) ? 0 : num;
    };

    return {
      name: d.company.ticker,
      Revenue: parseNum(revVal),
      "Net Income": parseNum(niVal),
    };
  });

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-1.5 hover:bg-surface-tertiary rounded-md transition-colors text-text-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[18px] font-semibold text-text-primary">
          Company Comparison
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart: Revenue vs Net Income */}
        <div className="bg-surface-primary border border-border-default rounded-lg p-4 shadow-sm h-[300px]">
          <h3 className="text-[13px] font-medium text-text-secondary mb-4 uppercase tracking-wider">Revenue vs Net Income</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(val) => `$${val >= 1000 ? val/1000 + 'k' : val}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1C1C1C', borderColor: '#333', fontSize: '12px' }}
                itemStyle={{ color: '#E5E5E5' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Revenue" fill="#3B82F6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Net Income" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="py-3 px-4 bg-surface-secondary border-b border-r border-border-default font-medium text-text-tertiary text-[11px] uppercase tracking-wider w-[200px]">
                Metric
              </th>
              {data.map((d) => (
                <th key={d.company.id} className="py-3 px-4 bg-surface-secondary border-b border-border-default font-medium text-text-primary text-[13px] text-center w-[200px]">
                  {d.company.name} <span className="text-text-tertiary font-normal">({d.company.ticker})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {Object.entries(METRIC_LABELS).map(([key, label]) => {
              return (
                <tr key={key} className="hover:bg-surface-hover transition-colors">
                  <td className="py-2.5 px-4 text-[13px] font-medium text-text-secondary border-r border-border-default">
                    {label}
                  </td>
                  {data.map((d) => {
                    const val = d.metrics?.[key];
                    return (
                      <td key={d.company.id} className="py-2.5 px-4 text-[13px] text-text-primary text-center">
                        {val ? formatMetricValue(val) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppShell title="Compare">
      <Suspense fallback={<div className="p-6"><SkeletonTable rows={10} cols={4} /></div>}>
        <CompareContent />
      </Suspense>
    </AppShell>
  );
}
