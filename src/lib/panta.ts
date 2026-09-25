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

export async function listMarkets(limit = 100) {
  const target = Math.max(1, Math.min(limit, 200));
  const items: PantaMarket[] = [];
  let nextCursor: string | null = null;
  let pages = 0;

  do {
    const pageSize = Math.min(50, target - items.length);
    const query = new URLSearchParams({limit: String(pageSize)});
    if (nextCursor) query.set("cursor", nextCursor);

    const page = await pantaFetch<{
      items: PantaMarket[];
      nextCursor?: string | null;
    }>(`/markets/?${query.toString()}`);

    items.push(...(page.items ?? []));
    nextCursor = page.nextCursor ?? null;
    pages += 1;
  } while (nextCursor && items.length < target && pages < 4);

  const deduped = [...new Map(items.map((market) => [market.marketId, market])).values()];

  return {
    items: deduped,
    nextCursor,
    pagesFetched: pages,
  };
}

export function getMarket(marketId: string) {
  return pantaFetch<PantaMarket>(`/markets/${encodeURIComponent(marketId)}/`);
}

export type PantaPosition = {
  marketId: string;
  category?: string | null;
  side: string;
  shares: string;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome?: string | null;
};

export function getPositions(wallet: string) {
  return pantaFetch<{wallet: string; positions: PantaPosition[]}>(
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

export type PrimaryBuild = {
  orderId: string;
  quoteId: string;
  wallet: string;
  marketId: string;
  side: string;
  amountUsdc: string;
  expectedShares: string;
  feeUsdc: string;
  status: string;
  instructions: Array<{
    programId: string;
    data: string;
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
  }>;
  recentBlockhash: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
};

export function buildPrimaryBuy(input: {
  quoteId: string;
  wallet: string;
  maxSlippageBps?: number;
}) {
  return pantaFetch<PrimaryBuild>("/primaryorderbuild/", {
    method: "POST",
    body: JSON.stringify({
      quoteId: input.quoteId,
      wallet: input.wallet,
      maxSlippageBps: input.maxSlippageBps ?? 100,
    }),
  });
}


export type PantaTrade = {
  id: string | number;
  marketId: string;
  wallet: string;
  isPrimary: boolean;
  yesAmount: string | number;
  noAmount: string | number;
  feePaid: string | number;
  blockTime: number | null;
  signature: string;
  quoteAsset: string;
};

export function getMarketTrades(marketId: string, limit = 50) {
  return pantaFetch<{marketId: string; items: PantaTrade[]}>(
    "/markets/" + encodeURIComponent(marketId) + "/trades/?limit=" + Math.min(limit, 200),
  );
}
