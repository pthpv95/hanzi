/** Optional macOS authoring tool. Generated files work on any deployment. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expressions } from "../src/data/expressions";

const run = promisify(execFile);
const output = join(process.cwd(), "public", "audio");
await mkdir(output, { recursive: true });
const temp = await mkdtemp(join(tmpdir(), "hanzi-audio-"));
const clips = expressions.flatMap((e) => [
  { key: e.id, text: e.zh },
  ...e.dialogue.map((line, i) => ({ key: `${e.id}-${i}`, text: line.zh })),
]);
try {
  for (const [i, clip] of clips.entries()) {
    const destination = join(output, `${clip.key}.m4a`);
    if (
      await stat(destination)
        .then((s) => s.size > 0)
        .catch(() => false)
    )
      continue;
    const wav = join(temp, `${clip.key}.aiff`);
    await run("say", ["-v", "Tingting", "-r", "165", "-o", wav, clip.text]);
    await run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      wav,
      "-c:a",
      "aac",
      "-b:a",
      "64k",
      "-movflags",
      "+faststart",
      destination,
    ]);
    if ((i + 1) % 12 === 0) console.log(`Audio: ${i + 1}/${clips.length}`);
  }
  console.log(`Ready: ${clips.length} Mandarin audio clips.`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
