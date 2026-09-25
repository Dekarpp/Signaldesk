import {NextRequest, NextResponse} from "next/server";

type Citation = {title: string; url: string};

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
    sources: [...sources.values()].slice(0, 8),
  };
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
    const market = await req.json();
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
      "Use fresh public web information where the market refers to a real-world event.",
      "Do not recommend a trade, do not promise returns, and do not invent facts.",
      "Separate verified facts, market-implied probability, uncertainty, and resolution mechanics.",
      "Stay neutral on political topics and do not tell the user how to vote or what political outcome to support.",
      sandbox
        ? "This is a Panta sandbox fixture. Explicitly say there is no real-world market to research and use it only to demonstrate the workflow."
        : "Treat the market question as live and time-sensitive.",
      !hasTextMetadata && imageUrl
        ? "Panta returned blank title/description. Inspect the attached market image and extract the exact market question only if it is clearly visible. If the image is ambiguous, say the market metadata is insufficient and do not guess."
        : "",
      "Return concise markdown using exactly these headings:",
      "## Market read",
      "## Evidence",
      "## Catalysts",
      "## Resolution & uncertainty",
      "## Watch triggers",
      "Keep the brief under 700 words.",
      "",
      JSON.stringify(market, null, 2),
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
        max_output_tokens: 1400,
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
    return NextResponse.json({
      analysis: result.text || "No analysis returned.",
      sources: result.sources,
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      sandbox,
      usedImage: Boolean(!sandbox && imageUrl),
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
