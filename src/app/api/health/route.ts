import {NextResponse} from "next/server";

export async function GET() {
  const pantaKey = process.env.PANTA_API_KEY?.replace(/\s+/g, "");
  const openaiKey = process.env.OPENAI_API_KEY?.replace(/\s+/g, "");

  const result = {
    pantaConfigured: Boolean(pantaKey),
    openaiConfigured: Boolean(openaiKey),
    openaiAuthOk: false,
    openaiStatus: null as number | null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
  };

  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {Authorization: `Bearer ${openaiKey}`},
        cache: "no-store",
      });
      result.openaiStatus = response.status;
      result.openaiAuthOk = response.ok;
    } catch {
      result.openaiAuthOk = false;
    }
  }

  return NextResponse.json(result);
}
