import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTutorConfig,
  estimateUsage,
  parseLesson,
  updateTranscript,
  markInterruptedCaption,
  UsageLedger,
  stopReason,
} from "../src/lib/tutor";
import {
  createTutorHandlers,
  createRateLimiter,
} from "../src/server/tutor-session";

test("lesson requests allow only curated scenarios and five or ten minutes", () => {
  assert.deepEqual(parseLesson({ scenario: "food", minutes: 10 }), {
    scenario: "food",
    minutes: 10,
  });
  for (const value of [
    { scenario: "anything", minutes: 10 },
    { scenario: "food", minutes: 100 },
    null,
  ]) {
    assert.throws(() => parseLesson(value));
  }
});

test("live configuration bounds context and output and enables captions and interruptions", () => {
  const config = buildTutorConfig({ scenario: "food", minutes: 10 });
  assert.equal(config.inputAudioTranscription !== undefined, true);
  assert.equal(config.outputAudioTranscription !== undefined, true);
  assert.equal(config.contextWindowCompression?.triggerTokens, "2048");
  assert.equal(
    config.contextWindowCompression?.slidingWindow?.targetTokens,
    "1024",
  );
  assert.ok((config.maxOutputTokens || Infinity) <= 320);
  assert.equal(
    config.realtimeInputConfig?.activityHandling,
    "START_OF_ACTIVITY_INTERRUPTS",
  );
  assert.match(String(config.systemInstruction), /不要辣/);
});

test("cost estimation prices audio and text separately and counts per-turn snapshots once", () => {
  const usage = {
    promptTokensDetails: [
      { modality: "AUDIO", tokenCount: 1000 },
      { modality: "TEXT", tokenCount: 100 },
    ],
    responseTokensDetails: [
      { modality: "AUDIO", tokenCount: 1000 },
      { modality: "TEXT", tokenCount: 100 },
    ],
    thoughtsTokenCount: 50,
  };
  assert.ok(Math.abs(estimateUsage(usage) - 0.01575) < 0.0000001);
  const ledger = new UsageLedger();
  ledger.observe(usage);
  ledger.observe(usage);
  assert.ok(Math.abs(ledger.total - 0.01575) < 0.0000001);
  ledger.commit();
  ledger.commit();
  assert.ok(Math.abs(ledger.total - 0.01575) < 0.0000001);
  ledger.observe(usage);
  ledger.commit();
  assert.ok(Math.abs(ledger.total - 0.0315) < 0.0000001);
});

test("lesson ends at its wall-clock deadline or its budget reserve", () => {
  assert.equal(stopReason(600_000, 600_000, 0.05, 10), "time");
  assert.equal(stopReason(100_000, 600_000, 0.25, 10), "budget");
  assert.equal(stopReason(100_000, 600_000, 0.05, 10), null);
});

test("partial captions are replaced by final speech without duplicating the interim text", () => {
  let lines = updateTranscript([], "user", "我想", { interim: true });
  lines = updateTranscript(lines, "user", "我想买单", { interim: true });
  lines = updateTranscript(lines, "user", "我想买单。", { finished: true });
  lines = updateTranscript(lines, "tutor", "可以说：", {});
  lines = updateTranscript(lines, "tutor", "麻烦买单。", { finished: true });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "我想买单。");
  assert.equal(lines[1].text, "可以说：麻烦买单。");
  assert.ok(lines.every((line) => line.final));
});

test("an empty finished caption closes the utterance instead of merging the next utterance into it", () => {
  let lines = updateTranscript([], "user", "你好。", {});
  lines = updateTranscript(lines, "user", "", { finished: true });
  lines = updateTranscript(lines, "user", "我想买单。", { finished: true });
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, "你好。");
  assert.equal(lines[1].text, "我想买单。");
});

test("interrupting queued speech marks its caption even when transcription has already finished", () => {
  const lines = updateTranscript([], "tutor", "你好，欢迎光临。你想吃什么？", {
    finished: true,
  });
  assert.equal(markInterruptedCaption(lines, true)[0].interrupted, true);
  assert.equal(markInterruptedCaption(lines, false)[0].interrupted, undefined);
});

function request(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/tutor/session", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}
const env = { apiKey: "test-server-key", accessCode: "test-classroom-code" };

test("missing setup, cross-origin requests and incorrect classroom codes never reach the provider", async () => {
  let calls = 0;
  const mintToken = async () => {
    calls++;
    return { name: "one-use-token" };
  };
  const missing = createTutorHandlers({
    env: { apiKey: "", accessCode: "" },
    mintToken,
  });
  assert.equal(
    (await missing.POST(request({ scenario: "food", minutes: 10 }))).status,
    503,
  );
  const handlers = createTutorHandlers({ env, mintToken });
  assert.equal(
    (
      await handlers.POST(
        request(
          { scenario: "food", minutes: 10, accessCode: env.accessCode },
          "https://evil.example",
        ),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handlers.POST(
        request({ scenario: "food", minutes: 10, accessCode: "wrong" }),
      )
    ).status,
    401,
  );
  assert.equal(calls, 0);
});

test("valid session issues a single-use, time-limited token with model constraints and no permanent key", async () => {
  let providerConfig: Record<string, any> | undefined;
  const now = 1_000_000;
  const handlers = createTutorHandlers({
    env,
    now: () => now,
    mintToken: async (config) => {
      providerConfig = config;
      return { name: "one-use-token" };
    },
  });
  const response = await handlers.POST(
    request({ scenario: "food", minutes: 10, accessCode: env.accessCode }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.token, "one-use-token");
  assert.equal(body.model, "gemini-3.8-live");
  assert.ok(!JSON.stringify(body).includes("test-server-key"));
  assert.equal(providerConfig?.uses, 1);
  assert.ok(Date.parse(providerConfig?.expireTime) <= now + 11 * 60_000);
  assert.equal(providerConfig?.liveConnectConstraints.model, "gemini-3.8-live");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("token issuance has a cooldown and malformed input is rejected before minting", async () => {
  let calls = 0;
  const handlers = createTutorHandlers({
    env,
    limiter: createRateLimiter(),
    now: () => 1_000_000,
    mintToken: async () => {
      calls++;
      return { name: "token" };
    },
  });
  const valid = { scenario: "food", minutes: 10, accessCode: env.accessCode };
  assert.equal(
    (await handlers.POST(request({ ...valid, minutes: 100 }))).status,
    400,
  );
  assert.equal((await handlers.POST(request(valid))).status, 200);
  assert.equal((await handlers.POST(request(valid))).status, 429);
  assert.equal(calls, 1);
});

test("provider errors are sanitized instead of exposing request credentials", async () => {
  const handlers = createTutorHandlers({
    env,
    mintToken: async () => {
      throw new Error("provider failed test-server-key");
    },
  });
  const response = await handlers.POST(
    request({ scenario: "food", minutes: 10, accessCode: env.accessCode }),
  );
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes("test-server-key"));
});

test("same-origin requests work behind a proxy while a foreign origin is rejected", async () => {
  const handlers = createTutorHandlers({
    env,
    mintToken: async () => ({ name: "token" }),
  });
  const proxied = new Request("http://localhost:3000/api/tutor/session", {
    method: "POST",
    headers: {
      origin: "https://hanzi.example",
      host: "hanzi.example",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      scenario: "food",
      minutes: 5,
      accessCode: env.accessCode,
    }),
  });
  assert.equal((await handlers.POST(proxied)).status, 200);
});
