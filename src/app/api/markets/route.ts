import {unstable_cache} from "next/cache";
import {NextResponse} from "next/server";
import {getMarket, listMarkets} from "@/lib/panta";
import {scoreMarket} from "@/lib/scoring";
import type {PantaMarket} from "@/lib/types";

function toEpochSeconds(value?: number | string) {
  if (value == null) return null;
  if (typeof value === "number") {
    return value > 10_000_000_000 ? value / 1000 : value;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000 ? numeric / 1000 : numeric;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms / 1000 : null;
}

function normalizeMarket(market: PantaMarket): PantaMarket {
  const title =
    market.title?.trim() ||
    market.question?.trim() ||
    market.description?.trim() ||
    "";

  const description =
    market.description?.trim() ||
    market.question?.trim() ||
    "";

  return {
    ...market,
    title,
    description,
  };
}

function mergeMarket(base: PantaMarket, detail: PantaMarket): PantaMarket {
  return normalizeMarket({
    ...base,
    ...detail,
    title: detail.title?.trim() || base.title,
    description: detail.description?.trim() || base.description,
    question: detail.question?.trim() || base.question,
    images: detail.images?.length ? detail.images : base.images,
    volumeUsdc: detail.volumeUsdc ?? base.volumeUsdc,
    totalVolumeUsdc: detail.totalVolumeUsdc ?? base.totalVolumeUsdc,
    yesPrice: detail.yesPrice ?? base.yesPrice,
    noPrice: detail.noPrice ?? base.noPrice,
    primaryYesPrice: detail.primaryYesPrice ?? base.primaryYesPrice,
    primaryNoPrice: detail.primaryNoPrice ?? base.primaryNoPrice,
    secondaryYesPrice: detail.secondaryYesPrice ?? base.secondaryYesPrice,
    secondaryNoPrice: detail.secondaryNoPrice ?? base.secondaryNoPrice,
  });
}

function isCurrentOrUpcoming(market: PantaMarket, nowSec: number) {
  const end =
    toEpochSeconds(market.endTime) ??
    toEpochSeconds(market.resolutionTime);

  return end == null || end >= nowSec;
}

const getCachedMarkets = unstable_cache(
  async () => {
    const nowSec = Date.now() / 1000;
    const page = await listMarkets(120);

    const catalog = [...page.items].map(normalizeMarket);

    // Keep the full Panta catalog visible, but only spend extra upstream calls
    // enriching the most useful rows for the primary user experience.
    const detailTargets = [...catalog]
      .sort((a, b) => {
        const currentA =
          (a.phase === "primary" || a.phase === "secondary") &&
          isCurrentOrUpcoming(a, nowSec);
        const currentB =
          (b.phase === "primary" || b.phase === "secondary") &&
          isCurrentOrUpcoming(b, nowSec);

        if (currentA !== currentB) return Number(currentB) - Number(currentA);

        const endA =
          toEpochSeconds(a.endTime) ??
          toEpochSeconds(a.resolutionTime) ??
          0;
        const endB =
          toEpochSeconds(b.endTime) ??
          toEpochSeconds(b.resolutionTime) ??
          0;

        const readableDelta =
          Number(Boolean(b.title?.trim())) -
          Number(Boolean(a.title?.trim()));
        if (readableDelta !== 0) return readableDelta;

        return endB - endA;
      })
      .slice(0, 16);

    const detailed = await Promise.all(
      detailTargets.map(async (market) => {
        try {
          return mergeMarket(market, await getMarket(market.marketId));
        } catch {
          return market;
        }
      }),
    );

    const detailById = new Map(
      detailed.map((market) => [market.marketId, market]),
    );

    const markets = catalog
      .map((market) => detailById.get(market.marketId) ?? market)
      .map((market) => scoreMarket(market, nowSec))
      .sort((a, b) => {
        const currentA =
          (a.phase === "primary" || a.phase === "secondary") &&
          (a.daysToClose ?? -1) >= 0;
        const currentB =
          (b.phase === "primary" || b.phase === "secondary") &&
          (b.daysToClose ?? -1) >= 0;

        if (currentA !== currentB) return Number(currentB) - Number(currentA);

        const recentA = a.daysToClose != null && a.daysToClose < 0
          ? a.daysToClose
          : Number.NEGATIVE_INFINITY;
        const recentB = b.daysToClose != null && b.daysToClose < 0
          ? b.daysToClose
          : Number.NEGATIVE_INFINITY;

        if (!currentA && recentA !== recentB) return recentB - recentA;
        return b.signalScore - a.signalScore;
      });

    const pantaKey = process.env.PANTA_API_KEY?.replace(/\s+/g, "");
    const mode = pantaKey?.startsWith("pk_live_") ? "live" : "test";
    const sandbox =
      mode === "test" ||
      markets.some(
        (market) =>
          market.marketId.startsWith("TestMarket") ||
          market.disclaimer?.toLowerCase().includes("sandbox"),
      );

    return {
      markets,
      fetchedAt: new Date().toISOString(),
      source: "Panta API",
      mode,
      sandbox,
      categories: [...new Set(markets.map((market) => market.category).filter(Boolean))],
      dataQuality: {
        catalogItemsFetched: page.items.length,
        catalogPagesFetched: page.pagesFetched ?? 1,
        currentOrUpcoming: markets.filter(
          (market) =>
            (market.phase === "primary" || market.phase === "secondary") &&
            (market.daysToClose ?? -1) >= 0,
        ).length,
        recentlyClosed: markets.filter(
          (market) =>
            (market.daysToClose ?? 1) < 0 &&
            (market.daysToClose ?? -31) >= -30,
        ).length,
        withReadableTitle: markets.filter((market) => Boolean(market.title?.trim())).length,
        executionReady: markets.filter(
          (market) =>
            market.phase === "primary" &&
            (market.daysToClose ?? -1) >= 0 &&
            market.yes != null &&
            market.no != null,
        ).length,
      },
    };
  },
  ["signaldesk-panta-markets-v2"],
  {revalidate: 30},
);

export async function GET() {
  try {
    return NextResponse.json(await getCachedMarkets());
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
