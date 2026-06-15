// ═══════════════════════════════════════════════════════════════════════════════
// Number / Currency / Percentage Formatters
// All financial displays use tabular-nums via CSS
// ═══════════════════════════════════════════════════════════════════════════════

import type { MetricValue } from "./types";

/**
 * Format a raw number as currency (USD).
 * Automatically scales to K/M/B for readability.
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: { compact?: boolean; decimals?: number }
): string {
  if (value === null || value === undefined) return "—";

  const { compact = true, decimals = 1 } = options ?? {};

  if (!compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000_000).toFixed(decimals)}T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;
  }
  return `${sign}$${abs.toFixed(decimals)}`;
}

/**
 * Format a percentage value (0.0–1.0 → "45.0%").
 */
export function formatPercent(
  value: number | null | undefined,
  options?: { decimals?: number; showSign?: boolean }
): string {
  if (value === null || value === undefined) return "—";

  const { decimals = 1, showSign = false } = options ?? {};
  const pct = value * 100;
  const sign = showSign && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Format a delta value as a signed percentage change.
 */
export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format a MetricValue based on its unit.
 */
export function formatMetricValue(metric: MetricValue | null | undefined): string {
  if (!metric || metric.value === null || metric.value === undefined) return "—";

  switch (metric.unit) {
    case "USD":
      return formatCurrency(metric.value);
    case "USD_M":
      return formatCurrency(metric.value * 1_000_000);
    case "USD_B":
      return formatCurrency(metric.value * 1_000_000_000);
    case "pct":
      return formatPercent(metric.value);
    case "x":
      return `${metric.value.toFixed(1)}x`;
    case "shares":
      return formatLargeNumber(metric.value);
    case "bps":
      return `${metric.value.toFixed(0)} bps`;
    default:
      return metric.value.toLocaleString("en-US");
  }
}

/**
 * Format a large number with K/M/B suffixes.
 */
export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/**
 * Determine delta color class.
 */
export function getDeltaColor(
  value: number | null | undefined,
  invertColors = false
): "text-emerald-400" | "text-red-400" | "text-zinc-500" {
  if (value === null || value === undefined || value === 0) return "text-zinc-500";
  const isPositive = invertColors ? value < 0 : value > 0;
  return isPositive ? "text-emerald-400" : "text-red-400";
}

/**
 * Format file size in bytes to human-readable string.
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format a date string to locale display.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format duration in milliseconds to human-readable string.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}
