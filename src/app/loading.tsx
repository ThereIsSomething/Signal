import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-secondary">
      <Loader2 className="h-8 w-8 text-accent-primary animate-spin mb-4" />
      <p className="text-sm text-text-secondary animate-pulse">Loading...</p>
    </div>
  );
}
