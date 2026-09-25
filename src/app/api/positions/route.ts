import {NextRequest, NextResponse} from "next/server";
import {getPositions} from "@/lib/panta";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim();
  if (!wallet) {
    return NextResponse.json({error: "wallet is required"}, {status: 400});
  }

  try {
    return NextResponse.json(await getPositions(wallet));
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
