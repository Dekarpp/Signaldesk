import {NextRequest, NextResponse} from "next/server";

type Citation = {title: string; url: string};

type SimpleBrief = {
  title: string;
  bottomLine: string;
  keyPoints: string[];
  uncertainty: string;
  watch: string[];
  confidence: "Low" | "Medium" | "High";
};

function extractResponse(data: any): {text: string; sources: Citation[]} {
  const output = Array.isArray(data?.output) ? data.output : [];
  const textParts: string[] = [];
  const sources = new Map<string, Citation>();

  for (const item of output) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        textParts.push(part.text);

        for (const annotation of Array.isArray(part?.annotations)
          ? part.annotations
          : []) {
          const url = annotation?.url;
          if (typeof url === "string" && url.startsWith("http")) {
            sources.set(url, {
              url,
              title:
                typeof annotation?.title === "string"
                  ? annotation.title
                  : new URL(url).hostname,
            });
          }
        }
      }
    }
  }

  return {
    text:
      textParts.join("\n").trim() ||
      (typeof data?.output_text === "string" ? data.output_text : ""),
    sources: [...sources.values()].slice(0, 6),
  };
}

function fallbackBrief(text: string): SimpleBrief {
  const clean = text.replace(/[#*_]/g, "").replace(/\s+/g, " ").trim();
  return {
    title: "Quick read",
    bottomLine: clean.slice(0, 240) || "No clear conclusion yet.",
    keyPoints: [],
    uncertainty: "The available evidence may be incomplete.",
    watch: [],
    confidence: "Low",
  };
}

function parseBrief(text: string): SimpleBrief {
  try {
    const parsed = JSON.parse(text);
    return {
      title: String(parsed?.title ?? "Quick read").slice(0, 90),
      bottomLine: String(parsed?.bottomLine ?? "").slice(0, 320),
      keyPoints: Array.isArray(parsed?.keyPoints)
        ? parsed.keyPoints.map(String).filter(Boolean).slice(0, 4)
        : [],
      uncertainty: String(parsed?.uncertainty ?? "").slice(0, 260),
      watch: Array.isArray(parsed?.watch)
        ? parsed.watch.map(String).filter(Boolean).slice(0, 3)
        : [],
      confidence:
        parsed?.confidence === "High" || parsed?.confidence === "Medium"
          ? parsed.confidence
          : "Low",
    };
  } catch {
    return fallbackBrief(text);
  }
}

function briefToText(brief: SimpleBrief) {
  const lines = [
    brief.title,
    "",
    brief.bottomLine,
    "",
    ...brief.keyPoints.map((point) => "• " + point),
    "",
    "Uncertainty: " + brief.uncertainty,
    "",
    ...brief.watch.map((item) => "Watch: " + item),
    "",
    "Confidence: " + brief.confidence,
  ];
  return lines.filter((line, index, all) => line || all[index - 1]).join("\n").trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.replace(/\s+/g, "");
  if (!apiKey) {
    return NextResponse.json(
      {error: "OPENAI_API_KEY is not configured"},
      {status: 503},
    );
  }

  try {
    const body = await req.json();
    const market = body?.market && typeof body.market === "object" ? body.market : body;
    const mode = body?.mode === "move" ? "move" : "research";
    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const sandbox =
      String(market?.marketId ?? "").startsWith("TestMarket") ||
      String(market?.disclaimer ?? "").toLowerCase().includes("sandbox");

    const hasTextMetadata =
      Boolean(String(market?.title ?? "").trim()) ||
      Boolean(String(market?.description ?? "").trim());
    const imageUrl =
      Array.isArray(market?.images) && typeof market.images[0] === "string"
        ? market.images[0]
        : null;

    const prompt = [
      "You are the research layer of SignalDesk, a prediction-market intelligence product.",
      "Explain the market so clearly that a smart 8-year-old could follow the structure.",
      "Use short sentences and everyday words. Avoid jargon unless it is necessary.",
      "Do not recommend a trade, do not promise returns, and do not invent facts.",
      "Separate verified facts from uncertainty. Market prices are context, not proof.",
      "Stay neutral on political topics and never tell the user how to vote or which political outcome to support.",
      sandbox
        ? "This is a Panta sandbox fixture. Say clearly that it is a demo market."
        : "Use fresh public web information where the market refers to a real-world event.",
      !hasTextMetadata && imageUrl
        ? "Panta returned blank text metadata. Inspect the attached market image only if the question is clearly readable. Otherwise say the market metadata is incomplete."
        : "",
      mode === "move"
        ? "Focus on what changed, the strongest plausible drivers, alternative explanations, and what would confirm or weaken those explanations."
        : "Focus on the simple bottom line, the strongest facts, the biggest uncertainty, and what to watch next.",
      "Keep bottomLine to no more than 2 short sentences.",
      "Return 2 to 4 keyPoints. Each must be one short sentence.",
      "Return no more than 3 watch items. Each must be one short sentence.",
      "Do not include URLs in any text field. Sources are displayed separately by the product.",
      "The confidence field means confidence in the quality of the evidence, not confidence that YES or NO will win.",
      "",
      "MARKET:",
      JSON.stringify(market, null, 2),
      mode === "move" ? "SIGNALDESK OBSERVED CONTEXT:" : "",
      mode === "move" ? JSON.stringify(context, null, 2) : "",
    ].filter(Boolean).join("\n");

    const inputContent: Array<Record<string, unknown>> = [
      {type: "input_text", text: prompt},
    ];

    if (!sandbox && imageUrl) {
      inputContent.push({
        type: "input_image",
        image_url: imageUrl,
        detail: "auto",
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6",
        input: [{role: "user", content: inputContent}],
        tools: sandbox ? [] : [{type: "web_search"}],
        reasoning: {effort: "low"},
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "signaldesk_simple_brief",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: {type: "string"},
                bottomLine: {type: "string"},
                keyPoints: {
                  type: "array",
                  items: {type: "string"},
                },
                uncertainty: {type: "string"},
                watch: {
                  type: "array",
                  items: {type: "string"},
                },
                confidence: {
                  type: "string",
                  enum: ["Low", "Medium", "High"],
                },
              },
              required: [
                "title",
                "bottomLine",
                "keyPoints",
                "uncertainty",
                "watch",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
        store: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {error: data?.error?.message ?? "OpenAI error " + response.status},
        {status: 502},
      );
    }

    const result = extractResponse(data);
    const brief = parseBrief(result.text);

    return NextResponse.json({
      brief,
      analysis: briefToText(brief),
      sources: result.sources,
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      sandbox,
      usedImage: Boolean(!sandbox && imageUrl),
      mode,
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
