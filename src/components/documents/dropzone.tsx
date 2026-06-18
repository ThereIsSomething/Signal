"use client";

import React, { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilingType } from "@/lib/utils/types";

interface DropzoneProps {
  onUpload: (file: File, metadata: UploadMetadata) => Promise<void>;
  compact?: boolean;
}

export interface UploadMetadata {
  companyName: string;
  ticker: string;
  filingType: FilingType;
  fiscalYear: number;
  fiscalQuarter: number | null;
}

export function Dropzone({ onUpload, compact = false }: DropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    companyName: "",
    ticker: "",
    filingType: "10-K",
    fiscalYear: new Date().getFullYear(),
    fiscalQuarter: null,
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "text/html": [".html", ".htm"],
      "text/plain": [".txt", ".text"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleSubmit = async () => {
    if (!selectedFile || !metadata.companyName || !metadata.ticker) return;
    setUploading(true);
    try {
      await onUpload(selectedFile, metadata);
      setSelectedFile(null);
      setMetadata({
        companyName: "",
        ticker: "",
        filingType: "10-K",
        fiscalYear: new Date().getFullYear(),
        fiscalQuarter: null,
      });
    } finally {
      setUploading(false);
    }
  };

  const inputClass =
    "w-full h-8 px-2.5 rounded-sm border border-border-default bg-surface-primary text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none transition-colors shadow-sm";

  return (
    <div className="space-y-4">
      {/* Drop Area */}
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          rounded-sm border-2 border-dashed ${compact ? 'p-3' : 'p-8'} cursor-pointer
          transition-colors
          ${
            isDragActive
              ? "border-accent-primary bg-accent-primary/5"
              : selectedFile
              ? "border-accent-emerald border-opacity-40 bg-accent-emerald-muted"
              : "border-border-default bg-surface-secondary hover:border-border-strong hover:bg-surface-tertiary"
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload
          className={`h-8 w-8 ${isDragActive ? "text-accent-primary" : "text-stone-300"}`}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-text-secondary">
            {isDragActive ? "Drop the file here" : "Drop your filing document here"}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            PDF, HTML, DOCX, TXT — up to 50MB
          </p>
        </div>
      </div>

      {/* Metadata Modal Overlay */}
      {selectedFile && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-secondary/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-surface-primary rounded-2xl shadow-2xl border border-border-default overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border-default">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                Document Analysis Setup
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="p-2 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-8">
              {/* Selected File Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-secondary border border-border-default">
                <div className="h-12 w-12 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-accent-emerald" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple Inc."
                    value={metadata.companyName}
                    onChange={(e) =>
                      setMetadata({ ...metadata, companyName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AAPL"
                    value={metadata.ticker}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        ticker: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Filing Type
                  </label>
                  <select
                    value={metadata.filingType}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        filingType: e.target.value as FilingType,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface-secondary text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-sm"
                  >
                    <option value="10-K">10-K (Annual)</option>
                    <option value="10-Q">10-Q (Quarterly)</option>
                    <option value="earnings_transcript">Earnings Transcript</option>
                    <option value="annual_report">Annual Report</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Fiscal Year
                  </label>
                  <input
                    type="number"
                    value={metadata.fiscalYear}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        fiscalYear: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface-secondary text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-sm"
                  />
                </div>
                {(metadata.filingType === "10-Q" ||
                  metadata.filingType === "earnings_transcript") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      Fiscal Quarter
                    </label>
                    <select
                      value={metadata.fiscalQuarter ?? ""}
                      onChange={(e) =>
                        setMetadata({
                          ...metadata,
                          fiscalQuarter: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-border-default bg-surface-secondary text-sm text-text-primary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all shadow-sm"
                    >
                      <option value="">Select Quarter</option>
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-secondary border-t border-border-default">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={uploading}
                disabled={!metadata.companyName || !metadata.ticker}
                icon={uploading ? undefined : <Upload className="h-4 w-4" />}
                className="px-6 rounded-lg"
              >
                {uploading ? "Processing..." : "Start Analysis"}
              </Button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
