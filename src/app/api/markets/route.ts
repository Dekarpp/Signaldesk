import {NextResponse} from "next/server";
import {getMarket, listMarkets} from "@/lib/panta";
import {scoreMarket} from "@/lib/scoring";

export async function GET() {
  try {
    const page = await listMarkets(24);
    const candidates = [...page.items]
      .filter((market) => market.phase === "primary" || market.phase === "secondary")
      .sort((a, b) => Number(b.volumeUsdc ?? 0) - Number(a.volumeUsdc ?? 0))
      .slice(0, 10);

    const detailed = await Promise.all(
      candidates.map(async (market) => {
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

    return NextResponse.json({
      markets,
      fetchedAt: new Date().toISOString(),
      source: "Panta API",
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
