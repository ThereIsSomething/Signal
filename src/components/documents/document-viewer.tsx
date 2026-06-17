"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Search, FileText } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  url: string;
  fileName: string;
  searchText?: string;
}

export function DocumentViewer({ url, fileName, searchText }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [localSearchText, setLocalSearchText] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfProxy, setPdfProxy] = useState<any>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const ext = fileName.split(".").pop()?.toLowerCase();
  const isPdf = ext === "pdf";
  const isHtml = ext === "html" || ext === "htm";
  const isTxt = ext === "txt" || ext === "text";
  const isDoc = ext === "doc" || ext === "docx";

  useEffect(() => {
    if (searchText) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalSearchText(searchText);
    }
  }, [searchText]);

  useEffect(() => {
    if (isTxt && url) {
      fetch(url)
        .then((res) => res.text())
        .then((text) => setTextContent(text))
        .catch((err) => console.error("Failed to fetch txt file", err));
    }
    if (isHtml && url) {
      fetch(url)
        .then((res) => res.text())
        .then((text) => setHtmlContent(text))
        .catch((err) => console.error("Failed to fetch html file", err));
    }
  }, [isTxt, isHtml, url]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onDocumentLoadSuccess(pdf: any) {
    setNumPages(pdf.numPages);
    setPdfProxy(pdf);
    setPageNumber(1);
  }

  // --- HTML iframe search and scroll ---
  useEffect(() => {
    if (isHtml && localSearchText && iframeRef.current?.contentWindow) {
      interface WindowWithFind extends Window {
        find(str: string): boolean;
      }
      const win = iframeRef.current.contentWindow as WindowWithFind;
      win.getSelection()?.removeAllRanges();
      
      // Try exact match
      let found = win.find(localSearchText);
      // Fallback to first few words if exact phrase formatting differs
      if (!found && localSearchText.includes(" ")) {
        const shortSearch = localSearchText.split(" ").slice(0, 4).join(" ");
        found = win.find(shortSearch);
      }
    }
  }, [localSearchText, isHtml, htmlContent]);

  // --- PDF page search ---
  useEffect(() => {
    async function findPdfPage() {
      if (!isPdf || !pdfProxy || !localSearchText) return;
      
      const searchStr = localSearchText.toLowerCase().replace(/\s+/g, "");
      const shortSearchStr = localSearchText.split(" ").slice(0, 4).join("").toLowerCase().replace(/\s+/g, "");

      for (let i = 1; i <= pdfProxy.numPages; i++) {
        try {
          const page = await pdfProxy.getPage(i);
          const textContent = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pageText = textContent.items.map((item: any) => item.str).join("").toLowerCase().replace(/\s+/g, "");
          
          if (pageText.includes(searchStr) || pageText.includes(shortSearchStr)) {
            setPageNumber(i);
            break;
          }
        } catch (e) {
          console.error("Error searching page", i, e);
        }
      }
    }
    findPdfPage();
  }, [isPdf, pdfProxy, localSearchText]);

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
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-text-tertiary" />
          <span className="text-[12px] font-medium text-text-secondary truncate max-w-[150px]">
            {fileName}
          </span>
        </div>

        {isPdf && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="p-1 text-text-secondary hover:bg-surface-tertiary rounded-sm disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[12px] font-medium text-text-primary min-w-[50px] text-center">
              {pageNumber} / {numPages || "-"}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
              disabled={pageNumber >= numPages}
              className="p-1 text-text-secondary hover:bg-surface-tertiary rounded-sm disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center relative">
            <Search className="h-3.5 w-3.5 text-text-tertiary absolute left-2" />
            <input 
              type="text" 
              placeholder="Highlight text..." 
              value={localSearchText}
              onChange={(e) => setLocalSearchText(e.target.value)}
              className="pl-7 pr-2 py-1 text-[12px] bg-surface-tertiary border border-border-default rounded-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary w-[140px]"
            />
          </div>

          {isPdf && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                className="p-1 text-text-secondary hover:bg-surface-tertiary rounded-sm"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[12px] font-medium text-text-secondary min-w-[36px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(3, s + 0.2))}
                className="p-1 text-text-secondary hover:bg-surface-tertiary rounded-sm"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewer Container */}
      <div className="flex-1 overflow-auto bg-stone-900/5 flex justify-center p-4">
        {isPdf && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="text-[13px] text-text-tertiary animate-pulse">Loading PDF...</div>}
            error={<div className="text-[13px] text-accent-red">Failed to load PDF.</div>}
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
        )}

        {isHtml && (
          <iframe 
            ref={iframeRef}
            srcDoc={htmlContent || "<html><body><p>Loading HTML...</p></body></html>"}
            className="w-full h-full bg-white rounded-md shadow-sm"
            title="HTML Viewer"
            sandbox="allow-same-origin allow-scripts"
          />
        )}

        {isTxt && (
          <div className="w-full h-full bg-surface-primary rounded-md shadow-sm p-6 overflow-auto">
            <pre className="text-[13px] text-text-primary font-mono whitespace-pre-wrap leading-relaxed">
              {textContent || "Loading..."}
            </pre>
          </div>
        )}

        {isDoc && (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
            className="w-full h-full bg-white rounded-md shadow-sm"
            title="Document Viewer"
          />
        )}

        {!isPdf && !isHtml && !isTxt && !isDoc && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-text-secondary">
              No preview available for this file type.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
