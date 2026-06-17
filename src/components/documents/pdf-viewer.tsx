"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  searchText?: string;
}

export function PdfViewer({ url, searchText }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [localSearchText, setLocalSearchText] = useState<string>("");

  useEffect(() => {
    if (searchText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalSearchText(searchText);
      // Note: react-pdf handles basic text matching visually if we use a custom text renderer,
      // but out of the box, standard browser Ctrl+F is easiest. To programmatically highlight,
      // we must implement customTextRenderer.
    }
  }, [searchText]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  // Basic custom text renderer for highlighting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTextRenderer = (textItem: any) => {
    if (!localSearchText) return textItem.str;
    const itemStr = textItem.str;
    const matchIndex = itemStr.toLowerCase().indexOf(localSearchText.toLowerCase());
    
    if (matchIndex === -1) return itemStr;
    
    return (
      <span className="bg-accent-amber/40 text-accent-amber font-bold rounded-sm px-0.5">
        {itemStr}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-secondary border-r border-border-default">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border-default bg-surface-primary shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 text-text-secondary hover:bg-surface-tertiary rounded-sm disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[12px] font-medium text-text-primary min-w-[60px] text-center">
            {pageNumber} / {numPages || "-"}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="p-1.5 text-text-secondary hover:bg-surface-tertiary rounded-sm disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center relative">
          <Search className="h-3.5 w-3.5 text-text-tertiary absolute left-2" />
          <input 
            type="text" 
            placeholder="Search text..." 
            value={localSearchText}
            onChange={(e) => setLocalSearchText(e.target.value)}
            className="pl-7 pr-2 py-1 text-[12px] bg-surface-tertiary border border-border-default rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary w-[160px]"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="p-1.5 text-text-secondary hover:bg-surface-tertiary rounded-sm transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[12px] font-medium text-text-secondary min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.2))}
            className="p-1.5 text-text-secondary hover:bg-surface-tertiary rounded-sm transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto bg-stone-900/5 flex justify-center p-4">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="text-[13px] text-text-tertiary animate-pulse">Loading PDF...</div>
          }
          error={
            <div className="text-[13px] text-accent-red">Failed to load PDF.</div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            customTextRenderer={customTextRenderer}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-md"
          />
        </Document>
      </div>
    </div>
  );
}
