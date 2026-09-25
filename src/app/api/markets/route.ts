import {NextResponse} from "next/server";
import {getMarket, listMarkets} from "@/lib/panta";
import {scoreMarket} from "@/lib/scoring";

export async function GET() {
  try {
    const page = await listMarkets(40);
    const active = [...page.items]
      .filter((market) => market.phase === "primary" || market.phase === "secondary")
      .sort((a, b) => Number(b.volumeUsdc ?? 0) - Number(a.volumeUsdc ?? 0))
      .slice(0, 16);

    const detailed = await Promise.all(
      active.map(async (market) => {
        try {
          return await getMarket(market.marketId);
        } catch {
          return market;
        }
      }),
    );

    const markets = detailed
      .map((market) => scoreMarket(market))
      .sort((a, b) => b.signalScore - a.signalScore);

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
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
