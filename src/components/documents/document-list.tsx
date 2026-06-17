"use client";

import React from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatFileSize } from "@/lib/utils/formatters";
import type { Document, DocumentStatus } from "@/lib/utils/types";

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "muted"; icon: React.ReactNode }
> = {
  uploaded: { label: "Uploaded", variant: "muted", icon: <Clock className="h-3 w-3" /> },
  parsing: { label: "Parsing", variant: "info", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  parsed: { label: "Parsed", variant: "info", icon: <CheckCircle2 className="h-3 w-3" /> },
  sectioning: { label: "Sectioning", variant: "info", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  extracting: { label: "Extracting", variant: "info", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  analyzing_tone: { label: "Analyzing Tone", variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  extracting_risks: { label: "Extracting Risks", variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  generating_memo: { label: "Generating Memo", variant: "warning", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: "Completed", variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Failed", variant: "danger", icon: <AlertCircle className="h-3 w-3" /> },
};

interface DocumentListProps {
  documents: (Document & { company_name?: string; company_ticker?: string })[];
  onDelete?: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-10 w-10 text-text-tertiary mb-3" />
        <p className="text-sm font-medium text-text-secondary">No documents yet</p>
        <p className="text-xs text-stone-500 mt-1">
          Upload a filing to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-border-default bg-surface-primary shadow-sm">
      <table className="data-grid">
        <thead>
          <tr>
            <th>Document</th>
            <th>Company</th>
            <th>Type</th>
            <th>Period</th>
            <th>Size</th>
            <th>Status</th>
            <th>Uploaded</th>
            {onDelete && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const status = statusConfig[doc.status];
            return (
              <tr key={doc.id}>
                <td>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-2 text-text-primary hover:text-accent-primary transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                    <span className="truncate max-w-[200px] text-[13px] font-medium">
                      {doc.file_name}
                    </span>
                  </Link>
                </td>
                <td className="text-text-secondary text-[13px]">
                  <span className="font-semibold text-text-primary">
                    {doc.company_ticker}
                  </span>
                  {doc.company_name && (
                    <span className="text-text-tertiary ml-1.5">
                      {doc.company_name}
                    </span>
                  )}
                </td>
                <td>
                  <Badge variant="default">{doc.filing_type}</Badge>
                </td>
                <td className="text-[13px] text-text-secondary tabular-nums">
                  {doc.fiscal_period}
                </td>
                <td className="text-[13px] text-text-tertiary tabular-nums">
                  {formatFileSize(doc.file_size_bytes)}
                </td>
                <td>
                  <Badge variant={status.variant} dot>
                    {status.label}
                  </Badge>
                </td>
                <td className="text-[13px] text-stone-500 tabular-nums">
                  {formatDate(doc.created_at)}
                </td>
                {onDelete && (
                  <td className="text-right">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this document?")) {
                          onDelete(doc.id);
                        }
                      }}
                      className="p-1.5 text-text-tertiary hover:text-accent-red hover:bg-accent-red-muted rounded-sm transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
