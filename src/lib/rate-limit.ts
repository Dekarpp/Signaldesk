type Bucket = {count: number; resetAt: number};

const buckets = new Map<string, Bucket>();

function consume(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return {ok: true, remaining: limit - 1, resetAt: now + windowMs};
  }

  if (current.count >= limit) {
    return {ok: false, remaining: 0, resetAt: current.resetAt};
  }

  current.count += 1;
  return {ok: true, remaining: limit - current.count, resetAt: current.resetAt};
}

export function checkAiRateLimit(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const clientId = (request.headers.get("x-signaldesk-client") ?? "browser").slice(0, 80);
  const userKey = "ai:user:" + ip + ":" + clientId;

  const perTenMinutes = consume(userKey + ":10m", 8, 10 * 60 * 1000);
  if (!perTenMinutes.ok) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((perTenMinutes.resetAt - Date.now()) / 1000)),
      reason: "Too many research requests. Try again in a few minutes.",
    };
  }

  const perHour = consume(userKey + ":1h", 20, 60 * 60 * 1000);
  if (!perHour.ok) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((perHour.resetAt - Date.now()) / 1000)),
      reason: "Hourly research limit reached. Try again later.",
    };
  }

  const globalHour = consume("ai:global:1h", 120, 60 * 60 * 1000);
  if (!globalHour.ok) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((globalHour.resetAt - Date.now()) / 1000)),
      reason: "SignalDesk research is temporarily at capacity.",
    };
  }

  // Keep the warm-instance map bounded.
  if (buckets.size > 5000) {
    const now = Date.now();
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {ok: true, retryAfterSec: 0, reason: ""};
}
