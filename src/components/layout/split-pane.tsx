"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number; // percentage 0–100
  minLeft?: number; // px
  minRight?: number; // px
  className?: string;
}

export function SplitPane({
  left,
  right,
  defaultSplit = 40,
  minLeft = 240,
  minRight = 320,
  className = "",
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;

      // Enforce min widths
      const minLeftPct = (minLeft / rect.width) * 100;
      const minRightPct = 100 - (minRight / rect.width) * 100;

      setSplitPercent(Math.min(Math.max(pct, minLeftPct), minRightPct));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minLeft, minRight]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full overflow-hidden ${className}`}
      style={{ cursor: isDragging ? "col-resize" : undefined }}
    >
      {/* Left Panel */}
      <div
        className="overflow-auto"
        style={{ width: `${splitPercent}%`, minWidth: minLeft }}
      >
        {left}
      </div>

      {/* Drag Handle */}
      <div
        className={`
          relative w-px shrink-0 cursor-col-resize group
          ${isDragging ? "bg-accent-primary" : "bg-border-default"}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* Wider invisible hit area */}
        <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
        {/* Visual hover indicator */}
        <div
          className={`
            absolute inset-y-0 -left-px -right-px transition-colors
            ${isDragging ? "bg-accent-primary" : "group-hover:bg-border-strong"}
          `}
        />
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 overflow-auto"
        style={{ minWidth: minRight }}
      >
        {right}
      </div>
    </div>
  );
}
