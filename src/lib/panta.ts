import type {PantaMarket} from "./types";

const BASE = process.env.PANTA_API_BASE_URL ?? "https://live-api.panta.market/api/v1";

function headers() {
  const key = process.env.PANTA_API_KEY?.replace(/\s+/g, "");
  if (!key) throw new Error("PANTA_API_KEY is not configured");
  return {"X-Api-Key": key, "Content-Type": "application/json"};
}

async function pantaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {...headers(), ...(init?.headers ?? {})},
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message ?? body?.code ?? `Panta API error ${response.status}`);
  }
  return body as T;
}

export function listMarkets(limit = 24) {
  return pantaFetch<{items: PantaMarket[]; nextCursor?: string | null}>(
    `/markets/?limit=${Math.min(limit, 50)}`,
  );
}

export function getMarket(marketId: string) {
  return pantaFetch<PantaMarket>(`/markets/${encodeURIComponent(marketId)}/`);
}

export function getPositions(wallet: string) {
  return pantaFetch<{wallet: string; positions: unknown[]}>(
    `/positions/?wallet=${encodeURIComponent(wallet)}`,
  );
}

export function quotePrimaryBuy(input: {
  wallet: string;
  marketId: string;
  side: "yes" | "no";
  amountUsdc: string;
}) {
  return pantaFetch<{
    quoteId: string;
    marketId: string;
    side: string;
    amountUsdc: string;
    shares: string;
    avgPrice: string;
    feeUsdc: string;
    expiresAt: string;
  }>("/primaryorderquote/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
