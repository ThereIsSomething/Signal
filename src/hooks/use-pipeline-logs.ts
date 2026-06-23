import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PipelineStep } from "@/lib/utils/types";

export interface PipelineLog {
  id: string;
  document_id: string;
  step: PipelineStep;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  input_preview: string | null;
  output_preview: string | null;
  created_at: string;
}

export function usePipelineLogs(documentId: string | null) {
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;

    const supabase = createClient();

    // Fetch initial logs
    async function fetchLogs() {
      setIsLoading(true);
      const { data } = await supabase
        .from("pipeline_runs")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: true });

      if (data) {
        setLogs(data as PipelineLog[]);
      }
      setIsLoading(false);
    }

    fetchLogs();

    // Subscribe to updates
    const channel = supabase
      .channel(`pipeline-logs-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pipeline_runs",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLogs((prev) => [...prev, payload.new as PipelineLog]);
          } else if (payload.eventType === "UPDATE") {
            setLogs((prev) =>
              prev.map((log) =>
                log.id === payload.new.id ? (payload.new as PipelineLog) : log
              )
            );
          } else if (payload.eventType === "DELETE") {
            setLogs((prev) =>
              prev.filter((log) => log.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  return { logs, isLoading };
}
