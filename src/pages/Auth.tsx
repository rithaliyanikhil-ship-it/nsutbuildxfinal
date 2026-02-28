import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Auth = () => {
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Store user info locally
    localStorage.setItem("userName", name);
    localStorage.setItem("userRollNo", rollNo);

    navigate("/dashboard");
  };

  return (
    <div className="auth-page-wrapper">
      <div className="glow purple"></div>
      <div className="glow cyan-bottom"></div>

      <div className="header">
        <Link to="/" className="logo-container">
          <img src="/exam_logo_1772208634325.png" alt="ProctorAI Logo" className="logo-img" />
          <div className="logo-text">ProctorAI</div>
        </Link>
      </div>

      <div className="auth-container min-h-screen mx-auto flex items-center justify-center">
        <div className="auth-card w-full">
          <div className="auth-header">
            <h1 className="auth-title">Get Started</h1>
            <p className="auth-subtitle">Enter your details to begin your exam</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input type="text" id="name" className="form-input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rollNo">Roll No</label>
              <input type="text" id="rollNo" className="form-input" placeholder="e.g. 2024CS001" value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Loading..." : "Continue to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
