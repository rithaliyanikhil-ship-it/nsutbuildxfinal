import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Home, FileText, Activity, Settings, Bell, CheckCircle, Video, Mic, Shield, ChevronRight } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  status: string;
  created_at: string;
}

interface ExamSession {
  id: string;
  exam_id: string;
  user_id: string;
  status: string;
  score: number | null;
  total_violations: number;
  created_at: string;
  exams: {
    title: string;
  } | null;
}

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const userName = localStorage.getItem("userName") || "";
  const userRollNo = localStorage.getItem("userRollNo") || "";

  useEffect(() => {
    if (!userName) {
      navigate("/auth");
    }
  }, [userName, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [examsRes, sessionsRes] = await Promise.all([
        supabase.from("exams").select("*").order("created_at", { ascending: false }),
        supabase.from("exam_sessions").select("*, exams(title)").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (examsRes.data) setExams(examsRes.data as Exam[]);
      if (sessionsRes.data) setSessions(sessionsRes.data as any[]);
    };

    fetchData();
  }, [user]);

  const handleSignOut = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userRollNo");
    navigate("/auth");
  };

  return (
    <div className="dashboard-page-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/" className="logo-container">
          <img src="/exam_logo_1772208634325.png" alt="ProctorAI Logo" className="logo-img" />
          <div className="logo-text">ProctorAI</div>
        </Link>

        <ul className="nav-menu">
          <li className="nav-item active">
            <Link to="/dashboard">
              <Home className="nav-icon" />
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/dashboard">
              <FileText className="nav-icon" />
              My Exams
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/dashboard">
              <Activity className="nav-icon" />
              Results
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/dashboard">
              <Settings className="nav-icon" />
              Settings
            </Link>
          </li>
        </ul>

        <div className="user-profile">
          <div className="avatar">
            {userName.substring(0, 2).toUpperCase() || "JD"}
          </div>
          <div className="user-info">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRollNo}</div>
          </div>
          <button onClick={handleSignOut} className="logout-btn" title="Sign Out">
            <LogOut size={20} className="nav-icon" />
          </button>
        </div>

        <div className="secure-info-box">
          <strong className="secure-title">
            <Shield size={14} /> Secure Environment
          </strong>
          <p>This platform utilizes strict proctoring measures including <span className="text-cyan">voice security</span>, <span className="text-purple">webcam monitoring</span>, and <span className="text-red">lockdown mode</span>.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <h1 className="page-title">Welcome back, {userName} 👋</h1>
          <div className="top-actions">
            <button className="notification-btn">
              <Bell size={24} />
              <span className="badge"></span>
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left Column: Exams */}
          <div className="dashboard-col">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Available Assessments</h2>
              </div>

              <div className="exam-list">
                <div className="exam-item">
                  <div className="exam-details">
                    <div className="exam-date">
                      <span className="month">Feb</span>
                      <span className="day">28</span>
                    </div>
                    <div className="exam-info">
                      <h4>Proctored Assessment</h4>
                      <p>
                        <span>AI-Proctored Exam</span>
                        <span className="dot-divider">•</span>
                        <span className="status status-ready">
                          <CheckCircle size={12} /> Ready
                        </span>
                      </p>
                    </div>
                  </div>
                  <a href="/exam.html" className="btn-start">Start Exam</a>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            {sessions.length > 0 && (
              <div className="card mt-8">
                <div className="card-header">
                  <h2 className="card-title">Recent Performance</h2>
                  <Link to="/dashboard" className="btn-sm">View History</Link>
                </div>
                <div className="exam-list">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="exam-item session-item">
                      <div className="exam-details">
                        <div className="exam-info">
                          <h4>{session.exams?.title || "Exam Session"}</h4>
                          <p className="session-stats">
                            <span>Score: <span className={session.score && session.score >= 70 ? "text-green" : "text-red"}>{session.score ?? "N/A"}%</span></span>
                            <span className="dot-divider">•</span>
                            <span>Violations: {session.total_violations}</span>
                          </p>
                        </div>
                      </div>
                      <div className={`session-status ${session.status}`}>
                        {session.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: System Status */}
          <div className="dashboard-col">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">System Status</h2>
                <span className="status-indicator">
                  <Activity size={12} fill="currentColor" /> Ready
                </span>
              </div>

              <div className="system-check-list">
                <div className="check-item">
                  <div className="check-info">
                    <div className="check-icon">
                      <Video size={18} />
                    </div>
                    <span className="check-name">Webcam Diagnostics</span>
                  </div>
                  <CheckCircle size={20} className="text-green" />
                </div>

                <div className="check-item">
                  <div className="check-info">
                    <div className="check-icon">
                      <Mic size={18} />
                    </div>
                    <span className="check-name">Audio Threshold</span>
                  </div>
                  <CheckCircle size={20} className="text-green" />
                </div>

                <div className="check-item warning">
                  <div className="check-info">
                    <div className="check-icon">
                      <Shield size={18} />
                    </div>
                    <span className="check-name">Anti-Cheat Engine</span>
                  </div>
                  <span className="check-action">Enabled</span>
                </div>
              </div>
            </div>

            <div className="tip-card card mt-8">
              <div className="tip-icon"><Activity size={24} /></div>
              <h3 className="tip-title">Proctor Tip</h3>
              <p className="tip-text">Ensure your environment is well-lit and quiet before starting proctored sessions to avoid false violation flags.</p>
              <button className="btn-tip">Learn More <ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
