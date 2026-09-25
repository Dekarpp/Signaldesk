import {NextRequest, NextResponse} from "next/server";

const BASE = process.env.PANTA_API_BASE_URL ?? "https://live-api.panta.market/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const access = String(body?.access ?? "").trim();
    const name = String(body?.name ?? "signaldesk").trim();
    const env = body?.env === "live" ? "live" : "test";
    const env = body?.env === "live" ? "live" : "test";

    if (!access) {
      return NextResponse.json({error: "Access token is required."}, {status: 400});
    }

    const response = await fetch(`${BASE}/account/keys/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        env,
        name: name || "signaldesk",
        revokeOthers: false,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {error: data?.message ?? data?.detail ?? data?.code ?? `Panta returned ${response.status}`},
        {status: response.status},
      );
    }

    const secret = String(data.secret ?? "").replace(/\s+/g, "");
    let verified = false;
    let verifyError: string | null = null;

    if (secret) {
      const verify = await fetch(`${BASE}/account/`, {
        headers: {"X-Api-Key": secret},
        cache: "no-store",
      });
      verified = verify.ok;
      if (!verify.ok) {
        const verifyBody = await verify.json().catch(() => ({}));
        verifyError = verifyBody?.message ?? verifyBody?.detail ?? verifyBody?.code ?? `Panta returned ${verify.status}`;
      }
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      env: data.env,
      requestedEnv: env,
      secret,
      verified,
      verifyError,
      createdAt: data.createdAt,
    }, {status: 201});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "API key creation failed."},
      {status: 500},
    );
  }
}
