import React, { useState } from "react";
import { usePipelineLogs } from "@/hooks/use-pipeline-logs";
import { Terminal, ChevronDown, ChevronUp, XCircle, CheckCircle2, Loader2, Circle } from "lucide-react";

interface FloatingLogsProps {
  documentId: string;
}

export function FloatingLogs({ documentId }: FloatingLogsProps) {
  const { logs, isLoading } = usePipelineLogs(documentId);
  const [isOpen, setIsOpen] = useState(false);

  if (!documentId) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {isOpen && (
        <div className="bg-surface-primary border border-border-default rounded-t-lg shadow-2xl w-[450px] max-h-[500px] flex flex-col mb-2">
          <div className="p-3 border-b border-border-default bg-surface-secondary rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-text-secondary" />
              <span className="text-[13px] font-semibold text-text-primary uppercase tracking-wider">
                Pipeline Execution Logs
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-black/95 text-stone-300 font-mono text-[11px]">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-stone-500 italic">No logs available yet...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {log.status === "completed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : log.status === "failed" ? (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : log.status === "running" ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      )}
                      <span className="font-semibold text-white">
                        [{log.step.toUpperCase()}]
                      </span>
                    </div>
                    <span className="text-stone-500">
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "--"}
                    </span>
                  </div>
                  <div className="pl-5.5 space-y-1">
                    {log.error_message && (
                      <div className="text-red-400 mt-1 whitespace-pre-wrap">
                        ERROR: {log.error_message}
                      </div>
                    )}
                    {log.output_preview && (
                      <div className="text-stone-400 mt-1 line-clamp-3 overflow-hidden text-ellipsis">
                        OUTPUT: {log.output_preview}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-surface-secondary border border-border-default text-text-primary hover:bg-surface-tertiary transition-transform hover:scale-105 font-medium text-[13px]"
        >
          <Terminal className="w-4 h-4" />
          View Logs
        </button>
      )}
    </div>
  );
}
