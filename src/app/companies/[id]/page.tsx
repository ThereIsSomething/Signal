"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentList } from "@/components/documents/document-list";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Building2 } from "lucide-react";
import type { DocumentWithCompanyJoin } from "@/lib/utils/types";

interface Company {
  id: string;
  name: string;
  ticker: string;
  industry: string | null;
  sector: string | null;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;
  const router = useRouter();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<DocumentWithCompanyJoin[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      if (companyData) {
        setCompany(companyData as Company);
      }

      const { data: docsData } = await supabase
        .from("documents")
        .select("*, companies(name, ticker)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (docsData) {
        const mapped: DocumentWithCompanyJoin[] = docsData.map((d: unknown) => {
          const row = d as DocumentWithCompanyJoin;
          return {
            ...row,
            company_name: row.companies?.name,
            company_ticker: row.companies?.ticker,
          };
        });
        setDocuments(mapped);
      }
      
      setLoading(false);
    }
    
    fetchData();

    // Realtime subscription for status updates
    const channel = supabase
      .channel(`company-docs-${companyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `company_id=eq.${companyId}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, supabase]);

  return (
    <AppShell title={company?.name || "Company"}>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-1.5 hover:bg-surface-tertiary rounded-md transition-colors text-text-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-surface-secondary rounded-lg flex items-center justify-center border border-border-default">
              <Building2 className="h-5 w-5 text-text-tertiary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                {company?.name || "Loading..."}
                {company?.ticker && (
                  <span className="text-sm font-mono bg-surface-secondary px-2 py-0.5 rounded text-text-secondary border border-border-default">
                    {company.ticker}
                  </span>
                )}
              </h1>
              {company && (company.sector || company.industry) && (
                <p className="text-sm text-text-tertiary mt-0.5">
                  {[company.sector, company.industry].filter(Boolean).join(" • ")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <h2 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-widest">
            Filing History
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-md bg-surface-secondary animate-shimmer border border-border-default"
                />
              ))}
            </div>
          ) : documents.length > 0 ? (
            <DocumentList 
              documents={documents} 
              onDelete={async (id) => {
                const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                if (response.ok) {
                  setDocuments((prev) => prev.filter((d) => d.id !== id));
                } else {
                  const result = await response.json();
                  alert("Failed to delete document: " + result.error);
                }
              }} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border-default rounded-lg bg-surface-secondary">
              <p className="text-sm font-medium text-text-secondary">No documents found</p>
              <p className="text-xs text-text-tertiary mt-1">
                Upload a filing to see it listed here.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
