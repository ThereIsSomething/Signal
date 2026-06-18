// ═══════════════════════════════════════════════════════════════════════════════
// Hook: useDocument
// Client-side hook for fetching document data with realtime status updates
// ═══════════════════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Document, DocumentStatus } from "@/lib/utils/types";

export function useDocument(documentId: string | null) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchDocument = useCallback(async () => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setDocument(data as Document);
    }
    setLoading(false);
  }, [documentId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocument();

    // Subscribe to realtime status updates
    if (!documentId) return;

    const channel = supabase
      .channel(`document-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          setDocument(payload.new as Document);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, fetchDocument, supabase]);

  return { document, loading, error, refetch: fetchDocument };
}

export function usePipelineStatus(documentId: string | null) {
  const [status, setStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!documentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    // Initial fetch
    supabase
      .from("documents")
      .select("status")
      .eq("id", documentId)
      .single()
      .then(({ data }) => {
        if (data) setStatus((data as Record<string, unknown>).status as DocumentStatus);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`pipeline-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          const newDoc = payload.new as Record<string, unknown>;
          setStatus(newDoc.status as DocumentStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, supabase]);

  return { status, loading };
}
