import assert from "node:assert/strict";
import { test } from "node:test";
import { LiveAudioPlayer } from "../src/lib/live-audio";

// Model the browser boundary: a queued source need not be audible yet.
function playbackFixture() {
  let amplitude = 0;
  const sources: { onended: (() => void) | null }[] = [];
  const analyser = {
    fftSize: 256,
    connect() {},
    getFloatTimeDomainData(data: Float32Array) { data.fill(amplitude); },
  };
  const context = {
    currentTime: 0,
    destination: {},
    createAnalyser: () => analyser,
    createBuffer: (_channels: number, length: number, rate: number) => ({
      duration: length / rate,
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const source = {
        buffer: null,
        onended: null as (() => void) | null,
        connect(target: unknown) {
          assert.equal(target, analyser, "playback must pass through the meter");
        },
        disconnect() {},
        start() {},
        stop() {},
      };
      sources.push(source);
      return source;
    },
  };
  const speaking: boolean[] = [];
  return {
    player: new LiveAudioPlayer(context as unknown as AudioContext, (value) => speaking.push(value)),
    sources,
    speaking,
    amplitude: (value: number) => { amplitude = value; },
  };
}

test("the avatar meter follows audible output rather than queued speech", () => {
  const { player, amplitude } = playbackFixture();
  amplitude(0.2);
  assert.equal(player.outputLevel, 0, "idle has no mouth movement");
  player.push("AAAAAA==");
  amplitude(0);
  assert.equal(player.outputLevel, 0, "queued silence keeps the mouth closed");
  amplitude(0.1);
  const quiet = player.outputLevel;
  assert.ok(quiet > 0 && quiet < 1);
  amplitude(0.2);
  assert.ok(player.outputLevel > quiet);
  amplitude(1);
  assert.equal(player.outputLevel, 1, "mouth amplitude must be bounded");
});

test("interruption clears mouth movement immediately and later speech can resume", () => {
  const { player, amplitude, speaking } = playbackFixture();
  player.push("AAAAAA==");
  amplitude(0.2);
  assert.ok(player.outputLevel > 0);
  player.interrupt();
  assert.equal(player.outputLevel, 0);
  assert.equal(player.isPlaying, false);
  assert.deepEqual(speaking, [true, false]);
  player.push("AAAAAA==");
  assert.ok(player.outputLevel > 0);
});

test("only finishing the final queued source ends the speaking expression", () => {
  const { player, sources, amplitude, speaking } = playbackFixture();
  player.push("AAAAAA==");
  player.push("AAAAAA==");
  amplitude(0.2);
  sources[0].onended?.();
  assert.equal(player.isPlaying, true);
  assert.ok(player.outputLevel > 0);
  sources[1].onended?.();
  assert.equal(player.outputLevel, 0);
  assert.equal(player.isPlaying, false);
  assert.equal(speaking.at(-1), false);
});
