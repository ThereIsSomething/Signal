"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";
import { Building2, Search, Trash2 } from "lucide-react";
import { SkeletonTable } from "@/components/ui/skeleton";

interface Company {
  id: string;
  name: string;
  ticker: string;
  industry: string | null;
  sector: string | null;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchCompanies() {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (data) {
        setCompanies(data as Company[]);
      }
      setLoading(false);
    }
    fetchCompanies();
  }, [supabase]);

  return (
    <AppShell title="Companies">
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-text-primary">
              Tracked Companies
            </h2>
            {selectedIds.size > 0 && (
              <button
                onClick={() => router.push(`/compare?ids=${Array.from(selectedIds).join(",")}`)}
                disabled={selectedIds.size < 2 || selectedIds.size > 3}
                className="px-3 py-1 text-[12px] font-medium bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Compare Selected ({selectedIds.size}/3)
              </button>
            )}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search companies..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-surface-primary border border-border-default rounded-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-border-default bg-surface-primary rounded-sm">
            <Building2 className="h-10 w-10 text-text-tertiary mb-3" />
            <p className="text-sm font-medium text-text-secondary">No companies tracked yet</p>
            <p className="text-xs text-stone-500 mt-1">
              Upload a document to automatically track its company.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border-default bg-surface-primary shadow-sm">
            <table className="data-grid w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-2.5 px-4 w-10 border-b border-border-default"></th>
                  <th className="py-2.5 px-4 font-medium text-text-tertiary text-[11px] uppercase tracking-wider border-b border-border-default">Company Name</th>
                  <th className="py-2.5 px-4 font-medium text-text-tertiary text-[11px] uppercase tracking-wider border-b border-border-default">Ticker</th>
                  <th className="py-2.5 px-4 font-medium text-text-tertiary text-[11px] uppercase tracking-wider border-b border-border-default">Sector</th>
                  <th className="py-2.5 px-4 font-medium text-text-tertiary text-[11px] uppercase tracking-wider border-b border-border-default">Industry</th>
                  <th className="py-2.5 px-4 w-10 border-b border-border-default"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {companies.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-surface-hover transition-colors cursor-pointer"
                    onClick={() => router.push(`/companies/${c.id}`)}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) {
                            if (next.size < 3) next.add(c.id);
                          } else {
                            next.delete(c.id);
                          }
                          setSelectedIds(next);
                        }}
                        className="rounded-sm border-border-default text-accent-primary focus:ring-accent-primary bg-surface-secondary"
                      />
                    </td>
                    <td className="py-3 px-4 text-[13px] font-medium text-text-primary">{c.name}</td>
                    <td className="py-3 px-4 text-[13px] font-mono text-text-secondary">{c.ticker}</td>
                    <td className="py-3 px-4 text-[13px] text-text-secondary">{c.sector || "—"}</td>
                    <td className="py-3 px-4 text-[13px] text-text-secondary">{c.industry || "—"}</td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete ${c.ticker}? This will permanently delete ALL documents, embeddings, and memos for this company.`)) {
                            const response = await fetch(`/api/companies/${c.id}`, { method: 'DELETE' });
                            if (response.ok) {
                              setCompanies((prev) => prev.filter((prevC) => prevC.id !== c.id));
                              if (selectedIds.has(c.id)) {
                                const next = new Set(selectedIds);
                                next.delete(c.id);
                                setSelectedIds(next);
                              }
                            } else {
                              const result = await response.json();
                              console.error("Failed to delete company", result.error);
                              alert("Failed to delete company: " + result.error);
                            }
                          }
                        }}
                        className="p-1.5 text-text-tertiary hover:text-accent-red hover:bg-accent-red-muted rounded-sm transition-colors cursor-pointer"
                        title="Delete company and all its documents"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
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
