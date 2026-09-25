import {NextRequest, NextResponse} from "next/server";
import {quotePrimaryBuy} from "@/lib/panta";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {wallet, marketId, side, amountUsdc} = body ?? {};

    if (!wallet || !marketId || !["yes", "no"].includes(side) || !amountUsdc) {
      return NextResponse.json(
        {error: "wallet, marketId, side, amountUsdc are required"},
        {status: 400},
      );
    }

    return NextResponse.json(
      await quotePrimaryBuy({
        wallet,
        marketId,
        side,
        amountUsdc: String(amountUsdc),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
