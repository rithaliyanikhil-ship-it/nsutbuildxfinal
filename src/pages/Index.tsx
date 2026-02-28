import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <div className="glow purple"></div>
      <div className="glow bottom"></div>

      <nav>
        <div className="logo-container">
          <img src="/exam_logo_1772208634325.png" alt="ProctorAI Logo" className="logo-img" />
          <div className="logo-text">ProctorAI</div>
        </div>
        <ul className="nav-links">
          <li><a href="#platform">Platform</a></li>
          <li><a href="#solutions">Solutions</a></li>
          <li><a href="#security">Security Core</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="nav-buttons">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/auth" state={{ mode: 'login' }} className="btn btn-outline" style={{ borderColor: 'transparent' }}>Sign In</Link>
              <Link to="/auth" state={{ mode: 'signup' }} className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="tagline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Next-Gen Secure Proctoring
          </div>
          <h1 className="hero-title">Academic Integrity, Powered By <span>AI Intelligence</span></h1>
          <p className="hero-desc">Conduct secure, seamless, and cheat-proof exams globally. Our automated platform uses advanced neural networks and behavior analysis to maintain the uncompromised standard of modern education.</p>
          <div className="nav-buttons" style={{ justifyContent: 'flex-start' }}>
            <Link to="/auth" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px' }}>Start Free Trial</Link>
            <a href="#solutions" className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px' }}>View Features</a>
          </div>
        </div>
        <div className="hero-image">
          <img src="/hero_graphic_1772209126957.png" alt="AI Proctoring Illustration" />
        </div>
      </section>

      <section className="stats">
        <div className="stat-item">
          <div className="stat-number">99.9%</div>
          <div className="stat-label">Uptime Reliability</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">5M+</div>
          <div className="stat-label">Exams Proctored</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">&lt;1s</div>
          <div className="stat-label">Threat Detection</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">200+</div>
          <div className="stat-label">Institutions Trusted</div>
        </div>
      </section>

      <section className="features" id="solutions">
        <div className="section-header">
          <span className="section-subtitle">Core Capabilities</span>
          <h2 className="section-title">Intelligent Defense Systems</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="icon-container">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5z"></path>
                <path d="M9 13v-1"></path>
                <path d="M15 13v-1"></path>
                <path d="M12 17v.01"></path>
                <path d="M12 7v.01"></path>
              </svg>
            </div>
            <h3>Facial Recognition & Tracking</h3>
            <p>Advanced biometrics instantly verify identity, ensuring the registered student remains present while flagging unauthorized multiple faces.</p>
          </div>

          <div className="feature-card">
            <div className="icon-container">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3>Secure Browser Lockdown</h3>
            <p>An impenetrable testing environment that restricts tabs, disables shortcuts, and prevents screen sharing or malicious applications.</p>
          </div>

          <div className="feature-card">
            <div className="icon-container">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
            </div>
            <h3>Object & Audio Detection</h3>
            <p>Continuous environmental monitoring AI that detects unauthorized devices, background voices, and suspicious audio anomalies instantly.</p>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-logo">ProctorAI &copy; 2026. All rights reserved.</div>
        <div className="footer-links">
          <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', marginLeft: '1rem' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#a1a1aa', textDecoration: 'none', marginLeft: '1rem' }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
