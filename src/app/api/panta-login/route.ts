import {NextRequest, NextResponse} from "next/server";
const BASE = process.env.PANTA_API_BASE_URL ?? "https://live-api.panta.market/api/v1";

export async function POST(req: NextRequest) {
  if (process.env.SIGNALDESK_SETUP_ENABLED !== "true") {
    return NextResponse.json({error: "Not found"}, {status: 404});
  }

  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    if (!email || !password) {
      return NextResponse.json({error: "Email and password are required."}, {status: 400});
    }

    const response = await fetch(`${BASE}/auth/token/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email, password}),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {error: data?.message ?? data?.detail ?? data?.code ?? `Panta returned ${response.status}`},
        {status: response.status},
      );
    }

    return NextResponse.json({access: data.access, refresh: data.refresh});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Login failed."},
      {status: 500},
    );
  }
}
