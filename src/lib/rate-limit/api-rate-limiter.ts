// ═══════════════════════════════════════════════════════════════════════════════
// HTTP API Rate Limiter — IP-based sliding window
// Protects API routes from abuse with configurable request limits.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

interface RateLimitConfig {
  /** Max requests allowed within the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Optional: a unique identifier for this rate limit bucket */
  name?: string;
}

interface RateLimitEntry {
  timestamps: number[];
  /** Blocked until this time if rate limited */
  blockedUntil: number | null;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Time until the window resets (ms) */
  resetInMs: number;
  /** Time until unblocked (ms), if blocked */
  retryAfterMs: number | null;
}

// In-memory store: IP -> { route -> entries }
const store = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStore(): void {
  const now = Date.now();
  for (const [ip, routes] of store) {
    for (const [route, entry] of routes) {
      // Remove entries where all timestamps have expired and no active block
      const cutoff = now - 60_000; // 1 minute grace
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0 && !entry.blockedUntil) {
        routes.delete(route);
      }
    }
    if (routes.size === 0) {
      store.delete(ip);
    }
  }
}

/**
 * Extract client IP from the request.
 * Handles various proxy headers.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;
  return "unknown";
}

/**
 * Check and enforce rate limits for an incoming request.
 *
 * @param request - The incoming HTTP request (used to extract client IP)
 * @param config - Rate limit configuration
 * @param routeKey - Optional route identifier (defaults to request URL pathname)
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  routeKey?: string
): RateLimitResult {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const route = routeKey ?? new URL(request.url).pathname;

  // Periodic cleanup
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupStore();
    lastCleanup = now;
  }

  // Get or create entry for this IP + route
  if (!store.has(clientIp)) {
    store.set(clientIp, new Map());
  }
  const routes = store.get(clientIp)!;
  if (!routes.has(route)) {
    routes.set(route, { timestamps: [], blockedUntil: null });
  }
  const entry = routes.get(route)!;

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: entry.blockedUntil - now,
      retryAfterMs: entry.blockedUntil - now,
    };
  }

  // Prune old timestamps outside the window
  const cutoff = now - config.windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  // Check if over limit
  if (entry.timestamps.length >= config.maxRequests) {
    // Block for 2x the window duration on limit exceeded
    const blockDuration = config.windowMs * 2;
    entry.blockedUntil = now + blockDuration;
    return {
      allowed: false,
      remaining: 0,
      resetInMs: blockDuration,
      retryAfterMs: blockDuration,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetInMs: config.windowMs - (now - Math.min(...entry.timestamps)),
    retryAfterMs: null,
  };
}

/**
 * Rate limit presets for different route types.
 */
export const RATE_LIMITS = {
  /** Strict: file upload endpoint (5 requests per minute per IP) */
  UPLOAD: { maxRequests: 5, windowMs: 60_000, name: "upload" },
  /** Moderate: delete/mutate endpoints (10 requests per minute per IP) */
  MUTATION: { maxRequests: 10, windowMs: 60_000, name: "mutation" },
  /** Lenient: test suite (20 requests per minute per IP) */
  TEST: { maxRequests: 20, windowMs: 60_000, name: "test" },
  /** Default: general API (30 requests per minute per IP) */
  DEFAULT: { maxRequests: 30, windowMs: 60_000, name: "default" },
} as const satisfies Record<string, RateLimitConfig>;

/**
 * Wraps an API route handler with rate limiting.
 * Returns a 429 response if rate limited.
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimit = checkRateLimitWithResponse(request, RATE_LIMITS.UPLOAD);
 *   if (rateLimit) return rateLimit;
 *   // ... handler logic
 * }
 * ```
 */
export function checkRateLimitWithResponse(
  request: Request,
  config: RateLimitConfig,
  routeKey?: string
): NextResponse | null {
  const result = checkRateLimit(request, config, routeKey);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please slow down.",
        retryAfterMs: result.retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.retryAfterMs ?? 60_000) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetInMs / 1000)),
        },
      }
    );
  }

  return null;
}
