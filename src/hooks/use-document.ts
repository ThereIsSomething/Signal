"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
    fetchDocument();

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
      setLoading(false);
      return;
    }

    supabase
      .from("documents")
      .select("status")
      .eq("id", documentId)
      .single()
      .then(({ data }) => {
        if (data) setStatus((data as Record<string, unknown>).status as DocumentStatus);
        setLoading(false);
      });

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

const FETCH_TIMEOUT_MS = 310_000; // just over the 300s Vercel limit

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Drives the pipeline step-by-step automatically.
 * Calls POST /api/pipeline/{documentId}/step whenever the document
 * is in a non-terminal state and no step is currently running.
 */
export function usePipelineDriver(documentId: string | null) {
  const [driving, setDriving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const drivingRef = useRef(false);
  const retryCountRef = useRef(0);
  const supabase = createClient();

  const advance = useCallback(async () => {
    if (!documentId || drivingRef.current) return;
    drivingRef.current = true;
    setDriving(true);
    setStepError(null);
    try {
      const res = await fetchWithTimeout(`/api/pipeline/${documentId}/step`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Step failed");
      retryCountRef.current = 0;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pipeline step failed";
      const isTimeout = e instanceof DOMException && e.name === "AbortError";
      const isNetworkError = msg === "Failed to fetch" || msg.includes("network");
      setStepError(isTimeout ? `Step timed out after ${FETCH_TIMEOUT_MS / 1000}s` : msg);
      if (isTimeout || isNetworkError) {
        retryCountRef.current++;
        console.warn(`[PipelineDriver] ${isTimeout ? "Timeout" : "Network error"} on step advance (attempt ${retryCountRef.current}), will retry`);
      }
      return null;
    } finally {
      drivingRef.current = false;
      setDriving(false);
    }
  }, [documentId]);

  const resume = useCallback(async () => {
    if (!documentId || drivingRef.current) return;
    drivingRef.current = true;
    setDriving(true);
    setStepError(null);
    try {
      const res = await fetchWithTimeout("/api/pipeline/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resume failed");
      retryCountRef.current = 0;
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Resume failed";
      const isTimeout = e instanceof DOMException && e.name === "AbortError";
      setStepError(isTimeout ? `Resume timed out after ${FETCH_TIMEOUT_MS / 1000}s` : msg);
      return null;
    } finally {
      drivingRef.current = false;
      setDriving(false);
    }
  }, [documentId]);

  return { driving, stepError, advance, resume, retryCount: retryCountRef.current };
}
