// ═══════════════════════════════════════════════════════════════════════════════
// Deterministic Section Splitter
// Splits parsed Markdown by SEC standardized headers.
// NO RAG — complete sections are passed to the LLM.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  SEC_SECTION_PATTERNS,
  EARNINGS_SECTIONS,
} from "@/lib/utils/constants";
import type { FilingType } from "@/lib/utils/types";

export interface ParsedSection {
  key: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  charCount: number;
  startLine: number;
  endLine: number;
}

/**
 * Split a parsed Markdown document into deterministic sections
 * based on SEC standardized headers.
 */
export function splitIntoSections(
  markdown: string,
  filingType: FilingType
): ParsedSection[] {
  const patterns =
    filingType === "earnings_transcript"
      ? EARNINGS_SECTIONS
      : SEC_SECTION_PATTERNS;

  const lines = markdown.split("\n");
  const sectionMatches: {
    key: string;
    title: string;
    lineIndex: number;
    patternIndex: number;
  }[] = [];

  // Find all section header positions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (let p = 0; p < patterns.length; p++) {
      const { pattern, key, title } = patterns[p];
      if (pattern.test(line)) {
        // Avoid duplicate matches for the same section key
        const existing = sectionMatches.find((m) => m.key === key);
        if (!existing) {
          sectionMatches.push({ key, title, lineIndex: i, patternIndex: p });
        }
        break;
      }
    }
  }

  // Sort by line position (they should be in order, but ensure it)
  sectionMatches.sort((a, b) => a.lineIndex - b.lineIndex);

  // Extract content between section headers
  const sections: ParsedSection[] = [];
  for (let i = 0; i < sectionMatches.length; i++) {
    const current = sectionMatches[i];
    const startLine = current.lineIndex + 1; // Skip the header line itself
    const endLine =
      i < sectionMatches.length - 1
        ? sectionMatches[i + 1].lineIndex - 1
        : lines.length - 1;

    const contentLines = lines.slice(startLine, endLine + 1);
    const content = contentLines.join("\n").trim();

    if (content.length > 0) {
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      sections.push({
        key: current.key,
        title: current.title,
        content,
        order: i + 1,
        wordCount,
        charCount: content.length,
        startLine: startLine + 1, // Convert to 1-indexed
        endLine: endLine + 1,
      });
    }
  }

  // If no sections were matched, create a single "full_document" section
  if (sections.length === 0) {
    const content = markdown.trim();
    sections.push({
      key: "full_document",
      title: "Full Document",
      content,
      order: 1,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      charCount: content.length,
      startLine: 1,
      endLine: lines.length,
    });
  }

  return sections;
}

/**
 * Get only the sections relevant for financial metric extraction.
 */
export function getFinancialSections(sections: ParsedSection[]): ParsedSection[] {
  const financialKeys = new Set([
    "item_7",    // MD&A — primary source of financial discussion
    "item_8",    // Financial Statements
    "financial_highlights",
    "prepared_remarks",
    "full_document",
  ]);
  return sections.filter((s) => financialKeys.has(s.key));
}

/**
 * Get only the risk factor section(s).
 */
export function getRiskSections(sections: ParsedSection[]): ParsedSection[] {
  const riskKeys = new Set(["item_1a", "full_document"]);
  return sections.filter((s) => riskKeys.has(s.key));
}

/**
 * Get sections relevant for tone analysis.
 */
export function getToneSections(sections: ParsedSection[]): ParsedSection[] {
  const toneKeys = new Set([
    "item_7",     // MD&A
    "prepared_remarks",
    "qa_session",
    "guidance",
    "opening_remarks",
    "closing_remarks",
    "full_document",
  ]);
  return sections.filter((s) => toneKeys.has(s.key));
}
