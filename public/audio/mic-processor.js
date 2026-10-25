// Worklet runs off the UI thread. The MIME rate is taken from AudioContext.
class HanziMicrophone extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = Math.round(sampleRate * 0.04);
    this.buffer = new ArrayBuffer(this.frames * 2);
    this.view = new DataView(this.buffer);
    this.offset = 0;
    this.energy = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      this.view.setInt16(
        this.offset * 2,
        sample < 0 ? sample * 32768 : sample * 32767,
        true,
      );
      this.energy += sample * sample;
      if (++this.offset === this.frames) {
        this.port.postMessage(
          { pcm: this.buffer, level: Math.sqrt(this.energy / this.frames) },
          [this.buffer],
        );
        this.buffer = new ArrayBuffer(this.frames * 2);
        this.view = new DataView(this.buffer);
        this.offset = 0;
        this.energy = 0;
      }
    }
    return true;
  }
}
registerProcessor("hanzi-mic", HanziMicrophone);
