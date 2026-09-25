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

export async function GET() {
  try {
    const nowSec = Date.now() / 1000;
    const page = await listMarkets(40);

    const active = [...page.items]
      .map(normalizeMarket)
      .filter((market) => market.phase === "primary" || market.phase === "secondary")
      .sort((a, b) => {
        const freshnessDelta =
          Number(isCurrentOrUpcoming(b, nowSec)) -
          Number(isCurrentOrUpcoming(a, nowSec));

        if (freshnessDelta !== 0) return freshnessDelta;

        const volumeA = Number(a.volumeUsdc ?? a.totalVolumeUsdc ?? 0) || 0;
        const volumeB = Number(b.volumeUsdc ?? b.totalVolumeUsdc ?? 0) || 0;
        return volumeB - volumeA;
      })
      .slice(0, 16);

    const detailed = await Promise.all(
      active.map(async (market) => {
        try {
          return mergeMarket(market, await getMarket(market.marketId));
        } catch {
          return market;
        }
      }),
    );

    const markets = detailed
      .map((market) => scoreMarket(market, nowSec))
      .sort((a, b) => {
        const freshnessDelta =
          Number((b.daysToClose ?? 0) >= 0) -
          Number((a.daysToClose ?? 0) >= 0);

        if (freshnessDelta !== 0) return freshnessDelta;
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

    return NextResponse.json({
      markets,
      fetchedAt: new Date().toISOString(),
      source: "Panta API",
      mode,
      sandbox,
      categories: [...new Set(markets.map((market) => market.category).filter(Boolean))],
      dataQuality: {
        currentOrUpcoming: markets.filter((market) => (market.daysToClose ?? 0) >= 0).length,
        withReadableTitle: markets.filter((market) => Boolean(market.title?.trim())).length,
        executionReady: markets.filter(
          (market) =>
            market.phase === "primary" &&
            market.yes != null &&
            market.no != null,
        ).length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
