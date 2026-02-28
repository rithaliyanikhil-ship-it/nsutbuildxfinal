import { supabase } from "@/integrations/supabase/client";

export class FaceDetectionMonitor {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private intervalId: number | null = null;
  private sessionId: string;
  private onViolation: (type: string, details: string) => void;
  private analysisInterval: number;

  constructor(
    sessionId: string,
    onViolation: (type: string, details: string) => void,
    analysisIntervalMs = 10000
  ) {
    this.sessionId = sessionId;
    this.onViolation = onViolation;
    this.canvas = document.createElement("canvas");
    this.analysisInterval = analysisIntervalMs;
  }

  async start(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
    });

    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = stream;
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;

    await new Promise<void>((resolve) => {
      this.videoElement!.onloadedmetadata = () => resolve();
    });

    this.intervalId = window.setInterval(() => this.analyze(), this.analysisInterval);
    return stream;
  }

  private async analyze() {
    if (!this.videoElement) return;

    this.canvas.width = 320;
    this.canvas.height = 240;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, 320, 240);
    const imageBase64 = this.canvas.toDataURL("image/jpeg", 0.5).split(",")[1];

    try {
      const { data, error } = await supabase.functions.invoke("analyze-proctoring", {
        body: { type: "face_detection", imageBase64, sessionId: this.sessionId },
      });

      if (error) {
        console.error("Face analysis error:", error);
        return;
      }

      const analysis = data?.analysis;
      if (!analysis) return;

      if (analysis.faces_count === 0) {
        this.onViolation("face_not_detected", "No face detected in webcam");
      } else if (analysis.faces_count > 1) {
        this.onViolation("multiple_faces", `${analysis.faces_count} faces detected`);
      } else if (analysis.suspicious) {
        this.onViolation("suspicious_behavior", analysis.details || "Suspicious behavior detected");
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.videoElement?.srcObject) {
      (this.videoElement.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
