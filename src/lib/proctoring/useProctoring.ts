import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FaceDetectionMonitor } from "./faceDetection";
import { VoiceDetectionMonitor } from "./voiceDetection";
import { TabSwitchDetectionMonitor } from "./tabSwitchDetection";
import { useToast } from "@/hooks/use-toast";

interface ProctoringConfig {
  sessionId: string;
  allowFaceDetection?: boolean;
  allowVoiceDetection?: boolean;
  allowTabSwitchDetection?: boolean;
  onTerminated?: () => void;
}

export function useProctoring(config: ProctoringConfig) {
  const { toast } = useToast();
  const [violations, setViolations] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const faceMonitor = useRef<FaceDetectionMonitor | null>(null);
  const voiceMonitor = useRef<VoiceDetectionMonitor | null>(null);
  const tabMonitor = useRef<TabSwitchDetectionMonitor | null>(null);

  const recordViolation = useCallback(async (violationType: string, description: string, severity = "warning") => {
    try {
      const { data, error } = await supabase.functions.invoke("record-violation", {
        body: {
          sessionId: config.sessionId,
          violationType,
          severity,
          description,
        },
      });

      if (error) {
        console.error("Failed to record violation:", error);
        return;
      }

      setViolations((prev) => [...prev, data?.violation]);

      const severityMap: Record<string, "default" | "destructive"> = {
        warning: "default",
        moderate: "destructive",
        critical: "destructive",
      };

      toast({
        title: "⚠️ Violation Detected",
        description,
        variant: severityMap[severity] || "default",
      });

      if (data?.terminated) {
        toast({
          title: "🚫 Exam Terminated",
          description: "Maximum violations exceeded. Your exam has been terminated.",
          variant: "destructive",
        });
        config.onTerminated?.();
      }
    } catch (err) {
      console.error("Error recording violation:", err);
    }
  }, [config.sessionId, config.onTerminated, toast]);

  const start = useCallback(async () => {
    try {
      if (config.allowFaceDetection !== false) {
        faceMonitor.current = new FaceDetectionMonitor(
          config.sessionId,
          (type, details) => {
            const severity = type === "face_not_detected" ? "warning" : type === "multiple_faces" ? "critical" : "moderate";
            recordViolation(type, details, severity);
          }
        );
        const stream = await faceMonitor.current.start();
        setVideoStream(stream);
      }

      if (config.allowVoiceDetection !== false) {
        voiceMonitor.current = new VoiceDetectionMonitor((details) => {
          recordViolation("voice_detected", details, "moderate");
        });
        await voiceMonitor.current.start();
      }

      if (config.allowTabSwitchDetection !== false) {
        tabMonitor.current = new TabSwitchDetectionMonitor((type, details) => {
          const severity = type === "tab_switch" ? "warning" : "moderate";
          recordViolation(type, details, severity);
        });
        tabMonitor.current.start();
      }

      setIsActive(true);
    } catch (err) {
      console.error("Failed to start proctoring:", err);
      toast({
        title: "Proctoring Error",
        description: "Failed to start proctoring. Please allow camera and microphone access.",
        variant: "destructive",
      });
    }
  }, [config, recordViolation, toast]);

  const stop = useCallback(() => {
    faceMonitor.current?.stop();
    voiceMonitor.current?.stop();
    tabMonitor.current?.stop();
    setIsActive(false);
    setVideoStream(null);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { violations, isActive, videoStream, start, stop };
}
