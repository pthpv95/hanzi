import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

test("the microphone worklet batches forty milliseconds of clipped little-endian PCM", async () => {
  const messages: { pcm: ArrayBuffer; level: number }[] = [];
  let Processor: any;
  const source = await readFile(
    new URL("../public/audio/mic-processor.js", import.meta.url),
    "utf8",
  ).catch(() => "");
  runInNewContext(source, {
    sampleRate: 16000,
    Float32Array,
    Int16Array,
    ArrayBuffer,
    DataView,
    Math,
    AudioWorkletProcessor: class {
      port = { postMessage: (m: any) => messages.push(m) };
    },
    registerProcessor: (_name: string, value: any) => {
      Processor = value;
    },
  });
  assert.ok(Processor, "The microphone capture processor must be registered");
  const processor = new Processor();
  const input = new Float32Array(128).fill(0.5);
  for (let i = 0; i < 4; i++) processor.process([[input]]);
  assert.equal(messages.length, 0);
  input[0] = -2;
  input[1] = 2;
  processor.process([[input]]);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].pcm.byteLength, 1280);
  const view = new DataView(messages[0].pcm);
  assert.equal(view.getInt16(512 * 2, true), -32768);
  assert.equal(view.getInt16(513 * 2, true), 32767);
  assert.equal(view.getInt16(0, true), 16383);
  assert.ok(messages[0].level > 0.4 && messages[0].level < 0.7);
});
