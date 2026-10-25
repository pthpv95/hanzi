/** Browser-only audio primitives. Recording stays in memory and is never stored. */
export function pcmBase64(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer))
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

export class LiveAudioPlayer {
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private analyser: AnalyserNode;
  private samples = new Float32Array(256);
  generatedSeconds = 0;
  get isPlaying() {
    return this.sources.size > 0;
  }
  get outputLevel() {
    if (!this.isPlaying) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    const power = this.samples.reduce((sum, value) => sum + value * value, 0);
    return Math.min(1, Math.sqrt(power / this.samples.length) * 4);
  }
  constructor(
    private context: AudioContext,
    private onSpeaking: (speaking: boolean) => void,
  ) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = this.samples.length;
    this.analyser.connect(context.destination);
  }
  push(base64: string, sampleRate = 24000) {
    const binary = atob(base64);
    if (!binary.length || binary.length % 2) return;
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const buffer = this.context.createBuffer(1, bytes.length / 2, sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < output.length; i++)
      output[i] = view.getInt16(i * 2, true) / 32768;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);
    this.sources.add(source);
    const start = Math.max(this.context.currentTime + 0.025, this.nextTime);
    this.nextTime = start + buffer.duration;
    this.generatedSeconds += buffer.duration;
    source.onended = () => {
      source.disconnect();
      this.sources.delete(source);
      if (!this.sources.size) this.onSpeaking(false);
    };
    source.start(start);
    this.onSpeaking(true);
  }
  interrupt() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      source.disconnect();
    }
    this.sources.clear();
    this.nextTime = 0;
    this.onSpeaking(false);
  }
}
