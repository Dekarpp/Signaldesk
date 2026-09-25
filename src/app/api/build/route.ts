import {NextRequest, NextResponse} from "next/server";
import {buildPrimaryBuy} from "@/lib/panta";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quoteId = String(body?.quoteId ?? "").trim();
    const wallet = String(body?.wallet ?? "").trim();
    const maxSlippageBps = Number(body?.maxSlippageBps ?? 100);

    if (!quoteId || !wallet) {
      return NextResponse.json(
        {error: "quoteId and wallet are required"},
        {status: 400},
      );
    }

    if (!Number.isFinite(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 5000) {
      return NextResponse.json(
        {error: "maxSlippageBps must be between 0 and 5000"},
        {status: 400},
      );
    }

    const build = await buildPrimaryBuy({quoteId, wallet, maxSlippageBps});

    return NextResponse.json({
      orderId: build.orderId,
      quoteId: build.quoteId,
      marketId: build.marketId,
      side: build.side,
      expectedShares: build.expectedShares,
      feeUsdc: build.feeUsdc,
      status: build.status,
      instructionCount: build.instructions?.length ?? 0,
      programIds: [...new Set((build.instructions ?? []).map((ix) => ix.programId))],
      recentBlockhash: build.recentBlockhash,
      lastValidBlockHeight: build.lastValidBlockHeight ?? null,
      expiresAt: build.expiresAt ?? null,
      signingRequired: true,
      broadcasted: false,
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unable to build transaction"},
      {status: 500},
    );
  }
}
