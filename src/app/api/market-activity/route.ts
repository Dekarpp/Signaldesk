import {NextRequest, NextResponse} from "next/server";
import {getMarketTrades} from "@/lib/panta";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("marketId")?.trim();
  if (!marketId) {
    return NextResponse.json({error: "marketId is required"}, {status: 400});
  }

  try {
    const tape = await getMarketTrades(marketId, 80);
    const items = tape.items ?? [];

    const summary = items.reduce(
      (acc, trade) => {
        acc.yesFlow += Number(trade.yesAmount ?? 0) || 0;
        acc.noFlow += Number(trade.noAmount ?? 0) || 0;
        acc.fees += Number(trade.feePaid ?? 0) || 0;
        if (trade.isPrimary) acc.primaryTrades += 1;
        else acc.secondaryTrades += 1;
        return acc;
      },
      {yesFlow: 0, noFlow: 0, fees: 0, primaryTrades: 0, secondaryTrades: 0},
    );

    const latestBlockTime = items.reduce<number | null>((latest, trade) => {
      if (!trade.blockTime) return latest;
      return latest == null ? trade.blockTime : Math.max(latest, trade.blockTime);
    }, null);

    return NextResponse.json({
      marketId,
      tradeCount: items.length,
      ...summary,
      latestBlockTime,
      recent: items.slice(0, 8).map((trade) => ({
        id: trade.id,
        yesAmount: trade.yesAmount,
        noAmount: trade.noAmount,
        feePaid: trade.feePaid,
        isPrimary: trade.isPrimary,
        blockTime: trade.blockTime,
        signature: trade.signature,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unable to load activity"},
      {status: 500},
    );
  }
}
