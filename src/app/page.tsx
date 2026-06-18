"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Dropzone } from "@/components/documents/dropzone";
import { DocumentList } from "@/components/documents/document-list";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UploadMetadata } from "@/components/documents/dropzone";
import type { Document } from "@/lib/utils/types";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

import {
  FileText,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Plus,
  Activity,
} from "lucide-react";

interface DashboardStats {
  totalDocuments: number;
  completedDocuments: number;
  processingDocuments: number;
  totalCompanies: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<(Document & { company_name?: string; company_ticker?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const [docsResult, companiesResult, recentDocsResult] = await Promise.all([
        supabase.from("documents").select("status", { count: "exact" }),
        supabase.from("companies").select("id", { count: "exact" }),
        supabase.from("documents").select("*, companies(name, ticker)").order("created_at", { ascending: false }).limit(5),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = (docsResult.data as any[]) || [];
      const totalDocuments = docsResult.count || 0;
      const completedDocuments = docs.filter(
        (d) => d.status === "completed"
      ).length;
      const processingDocuments = docs.filter(
        (d) =>
          d.status !== "completed" &&
          d.status !== "failed" &&
          d.status !== "uploaded"
      ).length;

      setStats({
        totalDocuments,
        completedDocuments,
        processingDocuments,
        totalCompanies: companiesResult.count || 0,
      });

      if (recentDocsResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = recentDocsResult.data.map((d: any) => ({
          ...d,
          company_name: d.companies?.name,
          company_ticker: d.companies?.ticker,
        }));
        setRecentDocs(mapped);
      }

      setLoading(false);
    }
    fetchData();

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleUpload = async (file: File, metadata: UploadMetadata) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyName", metadata.companyName);
    formData.append("ticker", metadata.ticker);
    formData.append("filingType", metadata.filingType);
    formData.append("fiscalYear", metadata.fiscalYear.toString());
    if (metadata.fiscalQuarter) {
      formData.append("fiscalQuarter", metadata.fiscalQuarter.toString());
    }

    const response = await fetch("/api/parse", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.documentId) {
      router.push(`/documents/${result.documentId}`);
    }
  };

  const statCards = [
    {
      label: "Total Documents",
      value: stats?.totalDocuments ?? 0,
      icon: FileText,
      color: "text-accent-secondary",
    },
    {
      label: "Analyzed",
      value: stats?.completedDocuments ?? 0,
      icon: TrendingUp,
      color: "text-accent-emerald",
    },
    {
      label: "Processing",
      value: stats?.processingDocuments ?? 0,
      icon: AlertTriangle,
      color: "text-accent-amber",
    },
    {
      label: "Companies",
      value: stats?.totalCompanies ?? 0,
      icon: BarChart3,
      color: "text-accent-primary",
    },
  ];

  return (
    <AppShell
      title="Signal Intelligence"
      actions={
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            window.location.href = "/documents";
          }}
        >
          New Document
        </Button>
      }
    >
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        {/* Hero Branding Section */}
        <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
          <div className="h-16 w-16 bg-accent-secondary/10 rounded-2xl flex items-center justify-center mb-2 shadow-inner border border-accent-secondary/20">
            <Activity className="h-8 w-8 text-accent-secondary" strokeWidth={2.5} />
          </div>
          <h1 className={`text-4xl font-extrabold text-text-primary tracking-tight ${spaceGrotesk.className}`}>
            Signal Intelligence
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl font-light">
            Advanced Financial Analysis & AI Document Processing
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} padding="md" className="border-border-default shadow-sm hover:border-border-subtle transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-bold text-text-primary mt-2 tabular-nums">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg bg-surface-secondary border border-border-default shadow-inner ${stat.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </Card>
                );
              })}
        </div>

        {/* Recent Activity */}
        <div className="pb-32">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
            Recent Activity
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
          ) : recentDocs.length > 0 ? (
            <DocumentList 
              documents={recentDocs} 
              onDelete={async (id) => {
                const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                if (response.ok) {
                  setRecentDocs((prev) => prev.filter((d) => d.id !== id));
                  // Update stats
                  setStats((prev) => prev ? { ...prev, totalDocuments: prev.totalDocuments - 1 } : prev);
                } else {
                  const result = await response.json();
                  alert("Failed to delete document: " + result.error);
                }
              }} 
            />
          ) : (
            <div className="flex items-center justify-center h-48 border border-dashed border-border-default rounded-lg bg-surface-secondary">
              <p className="text-text-secondary text-sm">No recent documents found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Hovering Quick Upload */}
      <div className="sticky bottom-6 mx-auto w-[calc(100%-3rem)] max-w-4xl z-40 bg-surface-primary/95 backdrop-blur-md border border-border-default p-3 px-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 shrink-0 text-left w-full md:w-auto">
            <h2 className="text-[13px] font-bold text-text-primary mb-0.5 uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-primary" /> Quick Upload
            </h2>
            <p className="text-xs text-text-secondary">
              Instantly ingest and analyze a new SEC filing. Supports PDF, HTML, DOCX, TXT.
            </p>
          </div>
          <div className="w-full md:w-[400px] shrink-0">
            <Dropzone onUpload={handleUpload} compact={true} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
