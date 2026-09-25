import {NextRequest, NextResponse} from "next/server";

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({error: "OPENAI_API_KEY is not configured"}, {status: 503});
  }

  try {
    const market = await req.json();
    const prompt = [
      "You are the research layer of SignalDesk, a prediction-market intelligence product.",
      "Analyze this Panta market using fresh public web information.",
      "Do not tell the user what to buy or sell and do not promise returns.",
      "Separate verified facts from uncertainty.",
      "Return concise markdown with sections: Snapshot, What could move this market, Evidence to verify, Uncertainty, Watch triggers.",
      "",
      JSON.stringify(market, null, 2),
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6",
        input: prompt,
        tools: [{type: "web_search"}],
        store: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        {error: data?.error?.message ?? `OpenAI error ${response.status}`},
        {status: 502},
      );
    }

    return NextResponse.json({
      analysis: extractOutputText(data) || "No analysis returned.",
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : "Unknown error"},
      {status: 500},
    );
  }
}
