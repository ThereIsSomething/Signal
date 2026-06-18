"use client";

import React from "react";
import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface-secondary text-text-primary">
      <FileQuestion className="h-16 w-16 text-text-tertiary mb-4" />
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-text-secondary mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/dashboard">
        <Button variant="secondary" icon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
