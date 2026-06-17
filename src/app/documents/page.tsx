"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Dropzone } from "@/components/documents/dropzone";
import { DocumentList } from "@/components/documents/document-list";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Document } from "@/lib/utils/types";
import type { UploadMetadata } from "@/components/documents/dropzone";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<(Document & { company_name?: string; company_ticker?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchDocuments() {
      const { data } = await supabase
        .from("documents")
        .select("*, companies(name, ticker)")
        .order("created_at", { ascending: false });

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = data.map((d: any) => ({
          ...d,
          company_name: d.companies?.name,
          company_ticker: d.companies?.ticker,
        }));
        setDocuments(mapped);
      }
      setLoading(false);
    }
    fetchDocuments();

    // Realtime subscription for status updates
    const channel = supabase
      .channel("documents-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents" },
        () => {
          fetchDocuments();
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

  return (
    <AppShell title="Documents">
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Upload Section */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Upload Filing
          </h2>
          <Dropzone onUpload={handleUpload} />
        </div>

        {/* Documents List */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3">
            Recent Documents
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-md bg-surface-tertiary animate-shimmer"
                />
              ))}
            </div>
          ) : (
            <DocumentList 
              documents={documents} 
              onDelete={async (id) => {
                const response = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                if (response.ok) {
                  setDocuments((prev) => prev.filter((d) => d.id !== id));
                } else {
                  const result = await response.json();
                  console.error("Failed to delete document", result.error);
                  alert("Failed to delete document: " + result.error);
                }
              }} 
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
