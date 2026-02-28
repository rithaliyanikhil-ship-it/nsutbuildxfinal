export class VoiceDetectionMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private intervalId: number | null = null;
  private onViolation: (details: string) => void;
  private threshold: number;
  private consecutiveDetections = 0;
  private requiredConsecutive = 3;

  constructor(onViolation: (details: string) => void, threshold = 30) {
    this.onViolation = onViolation;
    this.threshold = threshold;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);

    this.intervalId = window.setInterval(() => this.analyze(), 500);
  }

  private analyze() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;

    if (average > this.threshold) {
      this.consecutiveDetections++;
      if (this.consecutiveDetections >= this.requiredConsecutive) {
        this.onViolation(`Voice/sound detected (level: ${Math.round(average)})`);
        this.consecutiveDetections = 0;
      }
    } else {
      this.consecutiveDetections = 0;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
  }
}
