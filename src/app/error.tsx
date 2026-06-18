"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-secondary text-text-primary">
      <AlertTriangle className="h-16 w-16 text-accent-red mb-4" />
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-text-secondary mb-2 max-w-md text-center">
        An unexpected error occurred while loading this page.
      </p>
      {error.digest && (
        <p className="text-[12px] text-text-tertiary font-mono mb-6">
          Error ID: {error.digest}
        </p>
      )}
      <Button
        variant="secondary"
        onClick={reset}
        icon={<RefreshCw className="h-3.5 w-3.5" />}
      >
        Try Again
      </Button>
    </div>
  );
}
