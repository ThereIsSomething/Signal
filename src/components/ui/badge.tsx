import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-surface-secondary text-text-primary border-border-default shadow-sm",
  success:
    "bg-accent-emerald-muted text-accent-emerald border-accent-emerald border-opacity-30",
  warning:
    "bg-accent-amber-muted text-accent-amber border-accent-amber border-opacity-30",
  danger:
    "bg-accent-red-muted text-accent-red border-accent-red border-opacity-30",
  info:
    "bg-accent-tertiary text-text-primary border-accent-secondary border-opacity-30",
  muted:
    "bg-surface-tertiary text-text-secondary border-border-default",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-stone-400",
  success: "bg-accent-emerald",
  warning: "bg-accent-amber",
  danger: "bg-accent-red",
  info: "bg-accent-secondary",
  muted: "bg-stone-300",
};

export function Badge({ variant = "default", children, dot, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5
        text-[11px] font-medium leading-none whitespace-nowrap
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-sm ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
