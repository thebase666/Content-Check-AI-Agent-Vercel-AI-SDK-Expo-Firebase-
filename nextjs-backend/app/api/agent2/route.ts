import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type ReviewResult = {
  allowed: boolean;
  reason: "ok" | "political_content";
};

export async function POST(request: Request) {
  try {
    const { text }: { text: string } = await request.json();
    console.log("text-agent2", text);
    const { text: result } = await generateText({
      model: google("gemini-2.5-flash"),
      system: `
You are a strict content moderation classifier.

Task:
Determine whether the input text contains POLITICAL content.

Political content includes (but is not limited to):
- Governments
- Political parties
- Politicians
- Elections
- Public policy
- Geopolitical conflicts
- Political ideologies

Rules:
- If the text contains ANY political content → respond exactly: POLITICAL
- Otherwise → respond exactly: SAFE
- Output must be ONE WORD ONLY
- No explanation
`,
      prompt: text,
    });

    const label = result.trim().toUpperCase();

    if (label === "POLITICAL") {
      const res: ReviewResult = {
        allowed: false,
        reason: "political_content",
      };
      return Response.json(res);
    }

    const res: ReviewResult = {
      allowed: true,
      reason: "ok",
    };
    return Response.json(res);
  } catch (error) {
    console.error("Review API error:", error);

    return Response.json("Review API error", { status: 500 });
  }
}
