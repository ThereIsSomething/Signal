import React from "react";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { PIPELINE_STEPS_ORDER, PIPELINE_STEP_LABELS } from "@/lib/utils/constants";
import type { DocumentStatus, PipelineStep } from "@/lib/utils/types";

// Map document status to the current pipeline step
const STATUS_TO_STEP: Partial<Record<DocumentStatus, PipelineStep>> = {
  parsing: "parse",
  parsed: "section",
  sectioning: "section",
  extracting: "extract_metrics",
  analyzing_tone: "analyze_tone",
  extracting_risks: "extract_risks",
  generating_memo: "generate_memo",
};

interface PipelineProgressProps {
  status: DocumentStatus;
  className?: string;
}

export function PipelineProgress({ status, className = "" }: PipelineProgressProps) {
  const currentStep = STATUS_TO_STEP[status];
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          Pipeline Progress
        </span>
        {isCompleted && (
          <span className="text-[11px] text-accent-emerald font-medium">Complete</span>
        )}
        {isFailed && (
          <span className="text-[11px] text-accent-red font-medium">Failed</span>
        )}
      </div>

      {PIPELINE_STEPS_ORDER.map((step) => {
        const currentIdx = currentStep
          ? PIPELINE_STEPS_ORDER.indexOf(currentStep)
          : -1;
        const stepIdx = PIPELINE_STEPS_ORDER.indexOf(step);
        const isActive = step === currentStep && !isCompleted && !isFailed;
        const isDone = isCompleted || stepIdx < currentIdx;
        const isFailedStep = isFailed && step === currentStep;

        return (
          <div
            key={step}
            className={`
              flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px]
              ${isActive ? "bg-surface-secondary shadow-sm border border-border-default" : "border border-transparent"}
            `}
          >
            {isDone ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald shrink-0" />
            ) : isActive ? (
              <Loader2 className="h-3.5 w-3.5 text-accent-primary animate-spin shrink-0" />
            ) : isFailedStep ? (
              <XCircle className="h-3.5 w-3.5 text-accent-red shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-stone-300 shrink-0" />
            )}
            <span
              className={
                isDone
                  ? "text-text-secondary"
                  : isActive
                  ? "text-text-primary font-medium"
                  : isFailedStep
                  ? "text-accent-red"
                  : "text-text-tertiary"
              }
            >
              {PIPELINE_STEP_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
