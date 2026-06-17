"use client";

import React, { useCallback, useState } from "react";
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
        {selectedFile ? (
          <>
            <div className="flex items-center gap-2 text-accent-emerald">
              <FileText className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">
                {selectedFile.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="absolute top-3 right-3 p-1 rounded-sm text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Upload
              className={`h-8 w-8 ${isDragActive ? "text-accent-primary" : "text-stone-300"}`}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-text-secondary">
                Drop your filing document here
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                PDF, HTML, DOCX, TXT — up to 50MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Metadata Form */}
      {selectedFile && (
        <div className={`animate-fade-in grid ${compact ? 'grid-cols-4' : 'grid-cols-2'} gap-3 rounded-sm border border-border-default bg-surface-primary p-4 shadow-sm`}>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Company Name
            </label>
            <input
              type="text"
              placeholder="Apple Inc."
              value={metadata.companyName}
              onChange={(e) =>
                setMetadata({ ...metadata, companyName: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Ticker
            </label>
            <input
              type="text"
              placeholder="AAPL"
              value={metadata.ticker}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  ticker: e.target.value.toUpperCase(),
                })
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
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
              className={inputClass}
            >
              <option value="10-K">10-K (Annual)</option>
              <option value="10-Q">10-Q (Quarterly)</option>
              <option value="earnings_transcript">Earnings Transcript</option>
              <option value="annual_report">Annual Report</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
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
              className={inputClass}
            />
          </div>
          {(metadata.filingType === "10-Q" ||
            metadata.filingType === "earnings_transcript") && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                Quarter
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
                className={inputClass}
              >
                <option value="">Select Quarter</option>
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
          )}
          <div className="col-span-2 flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={uploading}
              disabled={!metadata.companyName || !metadata.ticker}
              icon={uploading ? undefined : <Upload className="h-3.5 w-3.5" />}
            >
              {uploading ? "Processing..." : "Upload & Analyze"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
