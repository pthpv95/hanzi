import type { CreateAuthTokenConfig } from "@google/genai";
import { createHash, timingSafeEqual } from "node:crypto";
import { buildTutorConfig, parseLesson, TUTOR_MODEL } from "../lib/tutor";
type Options = {
  env: { apiKey: string; accessCode: string };
  now?: () => number;
  limiter?: ReturnType<typeof createRateLimiter>;
  mintToken: (config: CreateAuthTokenConfig) => Promise<{ name?: string }>;
};
export function createRateLimiter() {
  return new Map<string, { attempts: number[]; issued: number[] }>();
}

export function createTutorHandlers({
  env,
  mintToken,
  now = Date.now,
  limiter = createRateLimiter(),
}: Options) {
  const configured = !!env.apiKey && env.accessCode.length >= 12;
  const json = (body: unknown, status = 200, headers = {}) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store", ...headers },
    });
  return {
    GET: async () =>
      json({ configured, accessCodeRequired: true, maxMinutes: 10 }),
    POST: async (request: Request) => {
      if (!configured)
        return json(
          {
            error: "Lớp học chưa được kết nối. Chủ lớp cần hoàn tất cấu hình.",
            code: "NOT_CONFIGURED",
          },
          503,
        );
      const origin = request.headers.get("origin");
      let sameOrigin = false;
      try {
        const parsedOrigin = new URL(origin || "");
        const host = request.headers.get("host") || new URL(request.url).host;
        sameOrigin =
          ["http:", "https:"].includes(parsedOrigin.protocol) &&
          parsedOrigin.host === host;
      } catch {
        /* Missing or malformed browser origin. */
      }
      if (!sameOrigin)
        return json({ error: "Yêu cầu kết nối không hợp lệ." }, 403);
      if (Number(request.headers.get("content-length") || 0) > 4096)
        return json({ error: "Yêu cầu quá dài." }, 413);
      let body: Record<string, unknown>;
      try {
        const raw = await request.text();
        if (raw.length > 4096) return json({ error: "Yêu cầu quá dài." }, 413);
        body = JSON.parse(raw);
        parseLesson(body);
      } catch {
        return json(
          { error: "Vui lòng chọn một chủ đề và thời lượng 5 hoặc 10 phút." },
          400,
        );
      }
      const timestamp = now();
      const identity = createHash("sha256")
        .update(
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "local",
        )
        .digest("hex");
      for (const [key, state] of limiter)
        if (
          ![...state.issued, ...state.attempts].some(
            (t) => timestamp - t < 3_600_000,
          )
        )
          limiter.delete(key);
      if (limiter.size >= 2000 && !limiter.has(identity))
        return json({ error: "Lớp học đang bận. Bạn thử lại sau nhé." }, 429);
      const state = limiter.get(identity) || { attempts: [], issued: [] };
      state.attempts = state.attempts.filter((t) => timestamp - t < 60_000);
      state.issued = state.issued.filter((t) => timestamp - t < 3_600_000);
      limiter.set(identity, state);
      if (state.attempts.length >= 10)
        return json(
          { error: "Bạn thử quá nhiều lần. Vui lòng đợi một phút." },
          429,
          { "Retry-After": "60" },
        );
      state.attempts.push(timestamp);
      const code = typeof body.accessCode === "string" ? body.accessCode : "";
      const hash = (text: string) => createHash("sha256").update(text).digest();
      if (
        code.length > 200 ||
        !timingSafeEqual(hash(code), hash(env.accessCode))
      )
        return json(
          { error: "Mã lớp học chưa đúng. Bạn kiểm tra lại nhé." },
          401,
        );
      if (
        state.issued.length >= 6 ||
        state.issued.some((t) => timestamp - t < 60_000)
      )
        return json(
          {
            error: "Vui lòng đợi trước khi bắt đầu lượt học mới.",
            code: "COOLDOWN",
          },
          429,
          { "Retry-After": "60" },
        );
      const lesson = parseLesson(body);
      const expiresAt = timestamp + lesson.minutes * 60_000 + 30_000;
      const liveConfig = buildTutorConfig(lesson);
      // Reserve before the network request to prevent concurrent issuance.
      state.issued.push(timestamp);
      try {
        const token = await mintToken({
          uses: 1,
          expireTime: new Date(expiresAt).toISOString(),
          newSessionExpireTime: new Date(timestamp + 60_000).toISOString(),
          liveConnectConstraints: { model: TUTOR_MODEL, config: liveConfig },
        });
        if (!token.name) throw new Error("Missing token");
        return json({
          token: token.name,
          model: TUTOR_MODEL,
          expiresAt,
          minutes: lesson.minutes,
        });
      } catch {
        state.issued = state.issued.filter((t) => t !== timestamp);
        return json(
          {
            error:
              "Chưa kết nối được gia sư. Chủ lớp kiểm tra API key, quyền truy cập mô hình và hạn mức thanh toán nhé.",
          },
          502,
        );
      }
    },
  };
}
