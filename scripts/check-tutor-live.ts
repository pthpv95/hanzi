/** Paid, opt-in integration check. Uses bundled synthetic speech, never a microphone. */
import { spawnSync } from "node:child_process";
import { GoogleGenAI, Modality, type Session } from "@google/genai";
import { UsageLedger } from "../src/lib/tutor";

if (!process.env.GEMINI_API_KEY || !process.env.TUTOR_ACCESS_CODE) {
  console.error(
    "Set GEMINI_API_KEY and TUTOR_ACCESS_CODE in .env.local first. No API request was made.",
  );
  process.exit(2);
}
const base = new URL(process.env.TUTOR_BASE_URL || "http://localhost:3001");
if (!["localhost", "127.0.0.1"].includes(base.hostname))
  throw new Error(
    "This test only sends the classroom code to a localhost server.",
  );
const response = await fetch(new URL("/api/tutor/session", base), {
  method: "POST",
  headers: { origin: base.origin, "content-type": "application/json" },
  body: JSON.stringify({
    scenario: "food",
    minutes: 5,
    accessCode: process.env.TUTOR_ACCESS_CODE,
  }),
});
if (!response.ok) {
  console.error(
    `Classroom setup failed (HTTP ${response.status}). Check local configuration; credentials were not logged.`,
  );
  process.exit(1);
}
const credentials = await response.json();
let session: Session | undefined;
let closed = false;
let chunks = 0;
let audioSeconds = 0;
let inputText = "";
let outputText = "";
let interrupted = false;
let interruptSent = false;
let failed = false;
let completedAfterInterruption = false;
let usageUpdates = 0;
const ledger = new UsageLedger();
const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function pcm(id: string): Buffer {
  const result = spawnSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    `public/audio/${id}.m4a`,
    "-f",
    "s16le",
    "-ac",
    "1",
    "-ar",
    "16000",
    "pipe:1",
  ]);
  if (result.status !== 0 || !result.stdout?.length)
    throw new Error("Cannot decode bundled speech; install FFmpeg.");
  return result.stdout;
}
const first = pcm("mai-dan");
const second = pcm("bu-yao-la-1");
async function sendAudio(buffer: Buffer) {
  for (let i = 0; i < buffer.length && !closed; i += 1280) {
    session?.sendRealtimeInput({
      audio: {
        data: buffer.subarray(i, i + 1280).toString("base64"),
        mimeType: "audio/pcm;rate=16000",
      },
    });
    await sleep(40);
  }
  if (!closed) session?.sendRealtimeInput({ audioStreamEnd: true });
}

let timeout: ReturnType<typeof setTimeout>;
const deadline = new Promise<never>((_, reject) => {
  timeout = setTimeout(() => {
    closed = true;
    session?.close();
    reject(new Error("Live test deadline"));
  }, 25_000);
});
try {
  const client = new GoogleGenAI({
    apiKey: credentials.token,
    httpOptions: { apiVersion: "v1beta" },
  });
  const connecting = client.live.connect({
    model: credentials.model,
    config: { responseModalities: [Modality.AUDIO] },
    callbacks: {
      onmessage: (message) => {
        if (message.usageMetadata) {
          usageUpdates++;
          ledger.observe(message.usageMetadata);
        }
        const content = message.serverContent;
        if (content?.inputTranscription?.text)
          inputText += content.inputTranscription.text;
        if (content?.outputTranscription?.text)
          outputText += content.outputTranscription.text;
        if (content?.interrupted) interrupted = true;
        for (const part of content?.modelTurn?.parts || []) {
          if (
            part.inlineData?.data &&
            part.inlineData.mimeType?.startsWith("audio/pcm")
          ) {
            chunks++;
            audioSeconds +=
              Buffer.from(part.inlineData.data, "base64").length / 2 / 24000;
            if (!interruptSent && session) {
              interruptSent = true;
              void sendAudio(second).catch(() => {
                failed = true;
              });
            }
          }
        }
        if (content?.turnComplete) {
          ledger.commit();
          if (interrupted) completedAfterInterruption = true;
        }
        if (
          (completedAfterInterruption &&
            chunks > 3 &&
            inputText.length > 0 &&
            ledger.total > 0) ||
          ledger.total >= 0.08
        ) {
          closed = true;
          session?.close();
        }
      },
      onerror: () => {
        failed = true;
        closed = true;
      },
      onclose: () => {
        closed = true;
      },
    },
  });
  void connecting.then(
    (connection) => {
      if (closed) connection.close();
    },
    () => {},
  );
  session = await Promise.race([connecting, deadline]);
  if (closed) session.close();
  else await sendAudio(first);
  while (!closed) await sleep(100);
} catch {
  failed = true;
} finally {
  clearTimeout(timeout!);
  closed = true;
  session?.close();
}
console.log(
  JSON.stringify(
    {
      audioChunks: chunks,
      generatedAudioSeconds: Math.round(audioSeconds * 10) / 10,
      inputCaptionReceived: inputText.length > 0,
      tutorCaptionReceived: outputText.length > 0,
      interruptionObserved: interrupted,
      completedAfterInterruption,
      usageUpdates,
      estimatedReportedCost: ledger.total,
      failed,
    },
    null,
    2,
  ),
);
process.exit(
  failed ||
    !chunks ||
    !inputText ||
    !outputText ||
    !interrupted ||
    !completedAfterInterruption
    ? 1
    : 0,
);
