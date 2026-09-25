import {NextResponse} from "next/server";

const ALLOWED_EVENTS = new Set([
  "session",
  "market_opened",
  "watchlist_add",
  "research_generated",
  "move_research_generated",
  "positions_loaded",
  "quote_generated",
  "build_generated",
  "feedback_submitted",
]);

function cleanString(value: unknown, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = cleanString(body?.event, 64);
    const anonymousId = cleanString(body?.anonymousId, 80);

    if (!ALLOWED_EVENTS.has(event) || !anonymousId) {
      return NextResponse.json({error: "Invalid traction event"}, {status: 400});
    }

    const properties =
      body?.properties && typeof body.properties === "object"
        ? {
            category: cleanString(body.properties.category, 40) || undefined,
            phase: cleanString(body.properties.phase, 30) || undefined,
            count:
              Number.isFinite(Number(body.properties.count))
                ? Math.max(0, Math.min(Number(body.properties.count), 10000))
                : undefined,
            rating:
              Number.isFinite(Number(body.properties.rating))
                ? Math.max(1, Math.min(Number(body.properties.rating), 5))
                : undefined,
            role: cleanString(body.properties.role, 40) || undefined,
            source: cleanString(body.properties.source, 60) || undefined,
            message: cleanString(body.properties.message, 500) || undefined,
          }
        : {};

    console.info(
      "SIGNALDESK_TRACTION",
      JSON.stringify({
        event,
        anonymousId,
        properties,
        at: new Date().toISOString(),
      }),
    );

    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: "Unable to record event"}, {status: 400});
  }
}
