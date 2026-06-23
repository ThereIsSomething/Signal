"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Tabs, TabPanel, useTabState } from "@/components/ui/tabs";
import { PipelineProgress } from "@/components/documents/pipeline-progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SkeletonTable, SkeletonText } from "@/components/ui/skeleton";
import { SplitPane } from "@/components/layout/split-pane";
import { createClient } from "@/lib/supabase/client";
import { formatMetricValue, formatDate, formatDelta, getDeltaColor } from "@/lib/utils/formatters";
import { METRIC_LABELS } from "@/lib/utils/constants";
import type { Document, FinancialMetric, ToneAnalysis, RiskFactor, InvestmentMemo, MetricValue, MetricWithDelta } from "@/lib/utils/types";
import dynamic from "next/dynamic";

const DocumentViewer = dynamic(
  () => import("@/components/documents/document-viewer").then((mod) => mod.DocumentViewer),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center bg-surface-secondary text-text-tertiary text-sm">Loading Viewer...</div> }
);
import { FloatingLogs } from "@/components/documents/floating-logs";
import {
  MessageSquare,
  AlertTriangle,
  FileEdit,
  BarChart3,
  Download,
  FileText,
  X,
  XCircle,
} from "lucide-react";

const TABS = [
  { id: "metrics", label: "Metrics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "tone", label: "Tone", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "risks", label: "Risks", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: "memo", label: "Memo", icon: <FileEdit className="h-3.5 w-3.5" /> },
];

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.id as string;
  const { activeTab, setActiveTab } = useTabState("metrics");

  const [document, setDocument] = useState<Document | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetric | null>(null);
  const [toneAnalyses, setToneAnalyses] = useState<ToneAnalysis[]>([]);
  const [risks, setRisks] = useState<RiskFactor[]>([]);
  const [memo, setMemo] = useState<InvestmentMemo | null>(null);
  const [metricsComparison, setMetricsComparison] = useState<MetricWithDelta[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeSearchText, setActiveSearchText] = useState<string>("");
  const [activeRisk, setActiveRisk] = useState<RiskFactor | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const docRes = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
      const metricsRes = await supabase.from("financial_metrics").select("*").eq("document_id", documentId).maybeSingle();
      const toneRes = await supabase.from("tone_analyses").select("*").eq("document_id", documentId);
      const risksRes = await supabase.from("risk_factors").select("*").eq("document_id", documentId).order("display_order");
      const memoRes = await supabase.from("investment_memos").select("*").eq("document_id", documentId).maybeSingle();

      let comparisonData: MetricWithDelta[] | null = null;
      if (docRes.data) {
        const doc = docRes.data as unknown as Document;
        setDocument(doc);

        // Fetch YoY comparison if we have a prior year
        if (doc.fiscal_year) {
          const priorYear = doc.fiscal_year - 1;
          const { data: priorMetrics } = await supabase
            .from("financial_metrics")
            .select("*")
            .eq("company_id", doc.company_id)
            .eq("fiscal_year", priorYear)
            .maybeSingle();

          if (priorMetrics) {
            const current = metricsRes.data as unknown as FinancialMetric | null;
            const prior = priorMetrics as unknown as FinancialMetric | null;

            if (current && prior) {
              const comparisons: MetricWithDelta[] = [];
              const currentRecord = current as unknown as Record<string, MetricValue | null>;
              const priorRecord = prior as unknown as Record<string, MetricValue | null>;

              for (const [key, label] of Object.entries(METRIC_LABELS)) {
                const currentVal = currentRecord[key] ?? null;
                const priorVal = priorRecord[key] ?? null;

                let delta: number | null = null;
                let deltaType: "positive" | "negative" | "neutral" = "neutral";

                if (currentVal?.value != null && priorVal?.value != null && priorVal.value !== 0) {
                  delta = (currentVal.value - priorVal.value) / Math.abs(priorVal.value);
                  deltaType = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
                }

                comparisons.push({ label, current: currentVal, prior: priorVal, delta, deltaType });
              }
              comparisonData = comparisons;
            }
          }
        }
      }

      setMetricsComparison(comparisonData);
      if (metricsRes.data) setMetrics(metricsRes.data as unknown as FinancialMetric);
      if (toneRes.data) setToneAnalyses(toneRes.data as unknown as ToneAnalysis[]);
      if (risksRes.data) setRisks(risksRes.data as unknown as RiskFactor[]);
      if (memoRes.data) setMemo(memoRes.data as unknown as InvestmentMemo);
      setLoading(false);
    }
    fetchData();

    // Realtime updates
    const channel = supabase
      .channel(`doc-detail-${documentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "documents", filter: `id=eq.${documentId}` },
        (payload) => { 
          setDocument(payload.new as unknown as Document);
          if (payload.old && payload.new.status !== (payload.old as { status?: string }).status) {
            fetchData();
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [documentId, supabase]);

  const isProcessing = document?.status !== "completed" && document?.status !== "failed";

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    const element = window.document.getElementById("memo-content");
    if (!element) return;
    
    import("html2pdf.js").then((html2pdf) => {
      const opt = {
        margin: 1,
        filename: `${document?.company_id}_memo.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" as const },
      };
      html2pdf.default().set(opt).from(element).save();
    });
  };

  const handleStopPipeline = async () => {
    try {
      await fetch(`/api/pipeline/${documentId}/stop`, { method: "POST" });
    } catch (err) {
      console.error("Failed to stop pipeline", err);
    }
  };

  const pdfUrl = document?.file_path
    ? supabase.storage.from("documents").getPublicUrl(document.file_path).data.publicUrl
    : null;

  const renderTabContent = () => (
    <div className="flex flex-col h-full bg-surface-primary">
      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} className="px-4 shrink-0 bg-surface-primary" />

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ─── METRICS TAB ────────────────────────────────────────── */}
        <TabPanel active={activeTab === "metrics"} className="h-full overflow-y-auto">
          <div className="p-4 max-w-4xl mx-auto">
            {loading || (!metrics && isProcessing) ? (
              <SkeletonTable rows={10} cols={3} />
            ) : !metrics ? (
              <div className="p-8 text-center text-text-secondary">No financial metrics available.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-default">
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th className="w-[200px]">Metric</th>
                      <th className="text-right">Current</th>
                      <th className="text-right w-[140px]">Prior Year</th>
                      <th className="text-right w-[100px]">YoY Change</th>
                      <th className="text-right w-[100px]">Raw Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(METRIC_LABELS).map(([key, label]) => {
                      const metricsRecord = metrics as unknown as Record<string, MetricValue | null> | null;
                      const val = metricsRecord?.[key] ?? null;
                      if (!val || val.value === null) return null;

                      const comp = metricsComparison?.find((c) => c.label === label);
                      const priorVal = comp?.prior ?? null;

                      return (
                        <tr 
                          key={key} 
                          className="hover:bg-surface-tertiary cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveSearchText(val.raw_text?.trim() || "");
                            setIsViewerOpen(true);
                          }}
                        >
                          <td className="metric-label">{label}</td>
                          <td className="metric-value">{formatMetricValue(val)}</td>
                          <td className="text-right text-[13px] font-medium tabular-nums text-text-secondary">
                            {priorVal ? formatMetricValue(priorVal) : "—"}
                          </td>
                          <td className={`text-right text-[13px] font-medium tabular-nums ${comp ? getDeltaColor(comp.delta) : 'text-text-muted'}`}>
                            {comp?.delta != null ? formatDelta(comp.delta) : "—"}
                          </td>
                          <td className="text-right text-[12px] text-text-tertiary font-mono truncate max-w-[120px]">
                            {val.raw_text || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabPanel>

        {/* ─── TONE TAB ───────────────────────────────────────────── */}
        <TabPanel active={activeTab === "tone"} className="h-full overflow-y-auto">
          <div className="p-4 max-w-4xl mx-auto">
            {loading || (toneAnalyses.length === 0 && isProcessing) ? (
              <SkeletonText lines={8} />
            ) : toneAnalyses.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">No tone analysis available.</div>
            ) : (
              <div className="space-y-4 min-w-0">
                {toneAnalyses.map((tone) => (
                  <Card key={tone.id} padding="md" className="min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-semibold text-text-primary">
                        {tone.section_key.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <Badge
                        variant={
                          tone.overall_tone === "confident"
                            ? "success"
                            : tone.overall_tone === "cautious"
                            ? "warning"
                            : tone.overall_tone === "defensive"
                            ? "danger"
                            : "default"
                        }
                      >
                        {tone.overall_tone || "neutral"}
                      </Badge>
                    </div>

                    {/* Score Bars */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { label: "Sentiment", value: tone.sentiment_score, color: "bg-accent-blue" },
                        { label: "Confidence", value: tone.confidence_score, color: "bg-accent-emerald" },
                        { label: "Hedging", value: tone.hedging_score, color: "bg-accent-amber" },
                      ].map((bar) => (
                        <div key={bar.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-text-tertiary">{bar.label}</span>
                            <span className="text-[11px] text-text-secondary tabular-nums font-medium">
                              {(bar.value * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${bar.color} transition-all`}
                              style={{ width: `${bar.value * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Key Phrases */}
                    {tone.key_phrases && tone.key_phrases.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">
                          Key Phrases
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 ">
                          {tone.key_phrases.slice(0, 8).map((phrase, i) => (
                            <div 
                              key={i}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                setActiveSearchText(phrase.text);
                                setIsViewerOpen(true);
                              }}
                            >
                              <Badge
                                className="max-w-full whitespace-normal break-words text-left"
                                variant={
                                  phrase.type === "confident"
                                    ? "success"
                                    : phrase.type === "hedging"
                                    ? "warning"
                                    : phrase.type === "cautious"
                                    ? "danger"
                                    : "default"
                                }
                              >
                                &ldquo;{phrase.text}&rdquo;
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notable Passages */}
                    {tone.notable_passages && tone.notable_passages.length > 0 && (
                      <div>
                        <span className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">
                          Notable Passages
                        </span>
                        <div className="space-y-2 mt-1.5">
                          {tone.notable_passages.slice(0, 5).map((passage, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                setActiveSearchText(passage.text);
                                setIsViewerOpen(true);
                              }}
                              className="p-3 rounded-md border border-border-default bg-surface-secondary cursor-pointer hover:border-accent-primary transition-colors"
                            >
                              <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap break-words">
                                &ldquo;{passage.text}&rdquo;
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant={
                                  passage.sentiment === "confident"
                                    ? "success"
                                    : passage.sentiment === "cautious"
                                    ? "warning"
                                    : passage.sentiment === "defensive"
                                    ? "danger"
                                    : "default"
                                }>
                                  {passage.sentiment}
                                </Badge>
                                {passage.page != null && (
                                  <span className="text-[11px] text-text-tertiary tabular-nums">
                                    p. {passage.page}
                                  </span>
                                )}
                                {passage.line != null && (
                                  <span className="text-[11px] text-text-tertiary tabular-nums">
                                    line {passage.line}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        {/* ─── RISKS TAB ──────────────────────────────────────────── */}
        <TabPanel active={activeTab === "risks"} className="h-full">
          {loading || (risks.length === 0 && isProcessing) ? (
            <div className="p-4"><SkeletonText lines={10} /></div>
          ) : risks.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">No risk factors found.</div>
          ) : (
            <SplitPane
              defaultSplit={35}
              left={
                <div className="border-r border-border-default h-full flex flex-col">
                  <div className="p-3 border-b border-border-default shrink-0">
                    <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                      Risk Factors ({risks.length})
                    </span>
                  </div>
                  <div className="divide-y divide-border-subtle overflow-y-auto flex-1">
                    {risks.map((risk) => (
                      <div
                        key={risk.id}
                        onClick={() => setActiveRisk(risk)}
                        className={`
                          px-3 py-2.5 cursor-pointer transition-colors
                          ${activeRisk?.id === risk.id ? "bg-surface-tertiary border-l-2 border-accent-primary" : "hover:bg-surface-tertiary"}
                          ${risk.is_new ? "diff-added" : risk.is_escalated ? "diff-changed" : ""}
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-text-primary truncate">
                              {risk.risk_title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="muted">{risk.risk_category}</Badge>
                              <Badge
                                variant={
                                  risk.severity === "critical"
                                    ? "danger"
                                    : risk.severity === "high"
                                    ? "warning"
                                    : "default"
                                }
                              >
                                {risk.severity}
                              </Badge>
                              {risk.is_new && <Badge variant="info">NEW</Badge>}
                              {risk.is_escalated && (
                                <Badge variant="danger">ESCALATED</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }
              right={
                <div className="p-4 h-full overflow-auto">
                  {activeRisk ? (
                    <div className="space-y-4">
                      <h3 className="text-[16px] font-semibold text-text-primary">{activeRisk.risk_title}</h3>
                      <div className="flex gap-2">
                        <Badge variant="muted">{activeRisk.risk_category}</Badge>
                        <Badge variant={activeRisk.severity === "critical" ? "danger" : "warning"}>{activeRisk.severity}</Badge>
                      </div>
                      {activeRisk.risk_summary && (
                        <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
                          {activeRisk.risk_summary}
                        </p>
                      )}
                      <div className="bg-surface-secondary p-3 rounded-md border border-border-default">
                        <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed font-mono">
                          {activeRisk.risk_text}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveSearchText(activeRisk.risk_text.trim());
                          setIsViewerOpen(true);
                        }}
                        className="text-[12px] text-accent-primary hover:underline font-medium"
                      >
                        Find in Document →
                      </button>
                    </div>
                  ) : (
                    <p className="text-[13px] text-text-tertiary">
                      Select a risk factor to view details.
                    </p>
                  )}
                </div>
              }
            />
          )}
        </TabPanel>

        {/* ─── MEMO TAB ───────────────────────────────────────────── */}
        <TabPanel active={activeTab === "memo"} className="h-full">
          <div className="h-full flex flex-col">
            {loading || (!memo && isProcessing) ? (
              <div className="max-w-[720px] mx-auto p-4">
                <SkeletonText lines={20} />
              </div>
            ) : !memo ? (
              <div className="p-8 text-center text-text-secondary">No investment memo generated.</div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-2 border-b border-border-default shrink-0 flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider pl-2">
                    Analysis Memo
                  </span>
                  <button 
                    onClick={handleExportPdf}
                    className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium bg-surface-tertiary hover:bg-border-default text-text-primary rounded-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SplitPane
                    defaultSplit={30}
                    minLeft={200}
                    minRight={480}
                    left={
                      <div className="border-r border-border-default h-full flex flex-col">
                        <div className="p-4 border-b border-border-default shrink-0">
                          <h3 className="text-sm font-semibold text-text-primary">
                            Evidence References
                          </h3>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-3">
                          {memo.evidence_refs?.map((ref, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-md border border-border-default bg-surface-secondary text-[12px] cursor-pointer hover:border-accent-primary transition-colors"
                              onClick={() => {
                                setActiveSearchText(ref.quote);
                                setIsViewerOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Badge variant="info">{ref.section}</Badge>
                                <span className="text-text-tertiary">→</span>
                                <Badge variant="muted">{ref.source_section}</Badge>
                              </div>
                              <p className="text-text-secondary italic leading-relaxed">
                                &ldquo;{ref.quote}&rdquo;
                              </p>
                            </div>
                          ))}
                          {(!memo.evidence_refs || memo.evidence_refs.length === 0) && (
                            <p className="text-[12px] text-stone-400">
                              No evidence references available.
                            </p>
                          )}
                        </div>
                      </div>
                    }
                    right={
                      <div className="overflow-y-auto h-full bg-surface-tertiary" id="memo-content">
                        <div className="memo-canvas p-6">
                          <div
                            dangerouslySetInnerHTML={{
                              __html: memo.memo_markdown
                                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/^\- (.*$)/gm, '<li>$1</li>')
                                .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
                                .replace(/\n\n/g, '</p><p>')
                                .replace(/^(.+)$/gm, (match) => {
                                  if (match.startsWith('<')) return match;
                                  return `<p>${match}</p>`;
                                }),
                            }}
                          />
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </TabPanel>
      </div>
    </div>
  );

  return (
    <AppShell title={document?.file_name || "Document"}>
      <div className="flex flex-col h-full">
        {/* Document Info Bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default bg-surface-primary shrink-0">
          {document && (
            <>
              <Badge variant="info">{document.filing_type}</Badge>
              <span className="text-[13px] text-text-secondary tabular-nums">
                {document.fiscal_period}
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-[13px] text-text-tertiary">
                {formatDate(document.created_at)}
              </span>
              <div className="flex-1" />
              <Badge
                variant={
                  document.status === "completed"
                    ? "success"
                    : document.status === "failed"
                    ? "danger"
                    : "warning"
                }
                dot
              >
                {document.status}
              </Badge>
            </>
          )}
        </div>

        {/* Pipeline Progress (when processing or failed) */}
        {(isProcessing || document?.status === "failed") && document && (
          <div className="px-4 py-3 border-b border-border-default bg-surface-secondary flex items-center justify-between">
            <div className="flex-1">
              <PipelineProgress status={document.status} />
            </div>
            {isProcessing && (
              <button 
                onClick={handleStopPipeline}
                className="ml-4 flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium bg-surface-primary border border-border-default hover:bg-accent-red/10 hover:text-accent-red hover:border-accent-red/30 rounded-md transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Stop Pipeline
              </button>
            )}
          </div>
        )}

        {/* Error Bar */}
        {document?.status === "failed" && (
          <div className="px-4 py-3 border-b border-accent-red/30 bg-accent-red/10 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-red" />
            <span className="text-[13px] text-accent-red font-medium">
              Pipeline failed: {document.error_message || "An unknown error occurred during processing."}
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {isViewerOpen ? (
            <SplitPane
              defaultSplit={50}
              left={
                pdfUrl ? (
                  <DocumentViewer url={pdfUrl} fileName={document?.file_name || "Document"} searchText={activeSearchText} />
                ) : (
                  <div className="h-full flex items-center justify-center text-text-tertiary bg-surface-secondary border-r border-border-default">
                    No Document Available
                  </div>
                )
              }
              right={renderTabContent()}
            />
          ) : (
            renderTabContent()
          )}

          {/* Floating Toggle Button */}
          {pdfUrl && (
            <button
              onClick={() => setIsViewerOpen(!isViewerOpen)}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-transform hover:scale-105 z-50 font-medium text-[13px]"
              title={isViewerOpen ? "Close Source Document" : "View Source Document"}
            >
              {isViewerOpen ? (
                <>
                  <X className="h-4 w-4" />
                  Close Source
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  View Original
                </>
              )}
            </button>
          )}
          
          <FloatingLogs documentId={documentId} />
        </div>
      </div>
    </AppShell>
  );
}
