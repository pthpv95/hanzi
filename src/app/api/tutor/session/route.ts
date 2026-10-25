import { GoogleGenAI } from "@google/genai";
import { createRateLimiter, createTutorHandlers } from "@/server/tutor-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limiter = createRateLimiter();
function handlers() {
  return createTutorHandlers({
    env: {
      apiKey: process.env.GEMINI_API_KEY || "",
      accessCode: process.env.TUTOR_ACCESS_CODE || "",
    },
    limiter,
    mintToken: (config) =>
      new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { apiVersion: "v1beta", timeout: 15_000 },
      }).authTokens.create({ config }),
  });
}
export async function GET() {
  return handlers().GET();
}
export async function POST(request: Request) {
  return handlers().POST(request);
}
