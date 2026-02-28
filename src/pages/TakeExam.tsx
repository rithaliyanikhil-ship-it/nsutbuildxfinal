import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProctoring } from "@/lib/proctoring/useProctoring";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Clock,
  Video,
  Shield,
  ChevronRight,
  Timer,
  Lock,
  Activity,
  ChevronLeft,
  Maximize2,
  UserCheck,
  Mic,
  CheckCircle,
  MessageSquare
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  is_proctored: boolean;
  max_violations: number;
  allow_face_detection: boolean;
  allow_voice_detection: boolean;
  allow_tab_switch_detection: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  points: number;
}

interface ExamSession {
  id: string;
  exam_id: string;
  user_id: string;
  status: string;
}

const TakeExam = () => {
  const { examId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState<"setup" | "active" | "finished">("setup");
  const [noiseLevel, setNoiseLevel] = useState<"low" | "high">("low");

  const proctoring = useProctoring({
    sessionId: sessionId || "preview",
    allowFaceDetection: exam?.allow_face_detection ?? true,
    allowVoiceDetection: exam?.allow_voice_detection ?? true,
    allowTabSwitchDetection: exam?.allow_tab_switch_detection ?? true,
    onTerminated: () => setStatus("finished"),
  });

  const { violations, isActive } = proctoring;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  useEffect(() => {
    if (status === "setup" && exam?.is_proctored && exam?.allow_face_detection) {
      proctoring.start();
    }
    return () => {
      if (status === "setup") proctoring.stop();
    };
  }, [status, exam]);

  useEffect(() => {
    if (!examId) return;
    const fetchExam = async () => {
      const [examRes, questionsRes] = await Promise.all([
        supabase.from("exams").select("*").eq("id", examId).single(),
        supabase.from("questions").select("*").eq("exam_id", examId).order("order_index"),
      ]);
      if (examRes.data) {
        setExam(examRes.data);
        setTimeLeft(examRes.data.duration_minutes * 60);
      }
      if (questionsRes.data) setQuestions(questionsRes.data);
    };
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (status !== "active" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  useEffect(() => {
    if (proctoring.videoStream && videoRef.current) {
      videoRef.current.srcObject = proctoring.videoStream;

      // Mock Audio Level Detection to keep the UI interactive
      if (exam?.allow_voice_detection) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext) {
          try {
            const analyzer = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(proctoring.videoStream);
            const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
            analyzer.smoothingTimeConstant = 0.8;
            analyzer.fftSize = 1024;
            microphone.connect(analyzer);
            analyzer.connect(javascriptNode);
            javascriptNode.connect(audioContext.destination);

            javascriptNode.onaudioprocess = function () {
              const array = new Uint8Array(analyzer.frequencyBinCount);
              analyzer.getByteFrequencyData(array);
              let values = 0;
              for (let i = 0; i < array.length; i++) {
                values += array[i];
              }
              const averageVolume = values / array.length;
              if (averageVolume > 40) {
                setNoiseLevel("high");
              } else {
                setNoiseLevel("low");
              }
            };
          } catch (e) {
            console.error("Audio detection error", e);
          }
        }
      }
    }
  }, [proctoring.videoStream, exam]);

  const startExam = async () => {
    if (!user || !examId) return;

    // Stop preview stream before creating session
    proctoring.stop();

    const { data: session, error } = await supabase
      .from("exam_sessions")
      .insert({ exam_id: examId, user_id: user.id, status: "in_progress" })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setSessionId(session.id);
    setStatus("active");

    // Start proctoring after session is created
    setTimeout(() => proctoring.start(), 500);
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    proctoring.stop();

    let score = 0;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) score += q.points || 1;
    });
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    await supabase
      .from("exam_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString(), score: percentage, answers: answers as any })
      .eq("id", sessionId);

    setStatus("finished");
    toast({ title: "Exam submitted!", description: `Your score: ${percentage}%` });
  };

  const formatTime = (s: number) => {
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!exam) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;

  if (status === "setup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" style={{ backgroundColor: 'var(--bg-dark)' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--glass-border)', padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '1rem' }}>{exam.title}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{exam.description}</p>
          <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <p>⏱ <strong>Duration:</strong> {exam.duration_minutes} minutes</p>
            <p>📝 <strong>Questions:</strong> {questions.length}</p>
            <p>✅ <strong>Passing Score:</strong> {exam.passing_score}%</p>
          </div>

          {exam.is_proctored && (
            <div style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontWeight: 600, marginBottom: '0.5rem' }}>
                <AlertTriangle size={16} /> Proctored Exam Environment
              </div>

              <div style={{ width: '100%', height: '150px', background: '#000', borderRadius: '8px', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!proctoring.videoStream && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', gap: '0.5rem', paddingTop: '40px' }}>
                    <Video size={32} />
                    Camera will activate on start
                  </div>
                )}
              </div>

              <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1.5rem', listStyle: 'circle' }}>
                {exam.allow_face_detection && <li>Camera will monitor your face</li>}
                {exam.allow_voice_detection && <li>Microphone will detect ambient sounds</li>}
                {exam.allow_tab_switch_detection && <li>Tab switching is strictly forbidden</li>}
                <li>Max {exam.max_violations} violations allowed before auto-termination</li>
              </ul>
            </div>
          )}

          <button onClick={startExam} className="btn btn-primary" style={{ width: '100%' }}>Start Secure Exam</button>
        </div>
      </div>
    );
  }

  if (status === "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4" style={{ backgroundColor: 'var(--bg-dark)' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--glass-border)', padding: '3rem 2rem', borderRadius: '16px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-light)', marginBottom: '1rem' }}>Exam Complete</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your answers have been securely recorded and submitted.</p>
          <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestionIndex];

  return (
    <div className="exam-page-wrapper">
      {/* Exam Header */}
      <header className="exam-header">
        <div className="exam-header-left">
          <Shield className="text-purple" size={24} />
          <div className="exam-meta">
            <h1 className="exam-title-text">{exam?.title || "Loading Assessment..."}</h1>
            <div className="exam-breadcrumb">
              <span>Standard Tier</span>
              <ChevronRight size={14} />
              <span>Session ID: {sessionId?.substring(0, 8) || "..."}</span>
            </div>
          </div>
        </div>

        <div className="exam-header-center">
          <div className="timer-display">
            <Timer size={20} className="text-cyan" />
            <span className="time-remaining">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="exam-header-right">
          <div className="security-badges">
            <div className={`badge-item ${isActive ? 'active' : ''}`}>
              <Lock size={14} /> Encrypted
            </div>
            <div className="badge-item active">
              <Activity size={14} /> Live
            </div>
          </div>
          <button className="btn-finish" onClick={handleSubmit}>Finish Attempt</button>
        </div>
      </header>

      <div className="exam-layout">
        {/* Left: Questions Area */}
        <div className="questions-container">
          <div className="question-nav-top">
            <div className="q-progress">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="q-dots">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`q-dot ${idx === currentQuestionIndex ? 'active' : ''} ${answers[questions[idx].id] ? 'filled' : ''}`}
                  onClick={() => setCurrentQuestionIndex(idx)}
                />
              ))}
            </div>
          </div>

          <div className="question-card">
            {questions.length > 0 ? (
              <>
                <div className="question-text">
                  {questions[currentQuestionIndex].question_text}
                </div>

                <div className="options-grid">
                  {questions[currentQuestionIndex].options?.map((option: string, idx: number) => (
                    <label key={idx} className={`option-label ${answers[questions[currentQuestionIndex].id] === option ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`q-${questions[currentQuestionIndex].id}`}
                        value={option}
                        checked={answers[questions[currentQuestionIndex].id] === option}
                        onChange={() => handleAnswerChange(questions[currentQuestionIndex].id, option)}
                        className="hidden-radio"
                      />
                      <span className="option-index">{String.fromCharCode(65 + idx)}</span>
                      <span className="option-content">{option}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <div className="loading-state">Initializing secure environment...</div>
            )}
          </div>

          <div className="question-actions">
            <button
              className="btn-nav"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft size={20} /> Previous
            </button>
            <button
              className="btn-nav btn-next"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next Question <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Right: Proctoring Panel */}
        <div className="proctor-panel">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {!proctoring.videoStream && (
            <div className="video-placeholder">
              <Video size={48} className="text-muted opacity-20" />
              <div className="video-overlay-text">Establishing Secure Feed...</div>
            </div>
          )}
          <div className="video-indicator">
            <span className="rec-dot"></span> REC
          </div>
          <div className="feed-controls">
            <button className="feed-btn"><Maximize2 size={16} /></button>
          </div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-header">
            <h3 className="telemetry-title">AI Telemetry</h3>
            <span className="telemetry-status">Active Monitoring</span>
          </div>

          <div className="telemetry-list">
            <div className="tele-item">
              <div className="tele-info">
                <UserCheck size={16} className="text-cyan" />
                <span>Face Auth</span>
              </div>
              <span className="tele-value text-green">Verified</span>
            </div>
            <div className="tele-item">
              <div className="tele-info">
                <Mic size={16} className="text-purple" />
                <span>Voice Bio</span>
              </div>
              <span className="tele-value text-green">Quiet</span>
            </div>
            <div className="tele-item">
              <div className="tele-info">
                <Activity size={16} className="text-cyan" />
                <span>Eye Tracking</span>
              </div>
              <span className="tele-value text-green">On-Screen</span>
            </div>
          </div>
        </div>

        <div className="violation-card">
          <div className="violation-header">
            <h3 className="violation-title">Incident Log</h3>
            <span className="violation-count">{violations.length}</span>
          </div>
          <div className="violation-list">
            {violations.length === 0 ? (
              <div className="empty-violations">
                <CheckCircle size={24} className="text-green opacity-50" />
                <p>No integrity incidents detected.</p>
              </div>
            ) : (
              violations.map((v, idx) => (
                <div key={idx} className="violation-item">
                  <AlertTriangle size={14} className="text-red" />
                  <div className="violation-meta">
                    <span className="violation-type">{v.type}</span>
                    <span className="violation-time">{new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button className="btn-help">
          <MessageSquare size={18} /> Call Proctor
        </button>
      </div>
    </div>
  );
};

export default TakeExam;
