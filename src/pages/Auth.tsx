import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const location = useLocation();
  const initialMode = location.state?.mode === 'login';
  const [isLogin, setIsLogin] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Wait for auth state to propagate before navigating
  const waitForSession = () => new Promise<void>((resolve) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        subscription.unsubscribe();
        resolve();
      }
    });
    // Fallback timeout
    setTimeout(() => { subscription.unsubscribe(); resolve(); }, 3000);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        await waitForSession();
        navigate("/dashboard");
      }
    } else {
      const { data, error } = await signUp(email, password, fullName, rollNo);
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else if (data?.session) {
        // Session available directly from signup (email confirm disabled)
        await waitForSession();
        toast({ title: "Welcome!", description: "Account created successfully." });
        navigate("/dashboard");
      } else {
        // Email confirmation may be enabled - try to sign in anyway
        const { error: signInError } = await signIn(email, password);
        if (!signInError) {
          await waitForSession();
          toast({ title: "Welcome!", description: "Account created successfully." });
          navigate("/dashboard");
        } else {
          // Last resort: set session manually if signup returned user data
          if (data?.user) {
            // Force get the session that might have been created
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              toast({ title: "Welcome!", description: "Account created successfully." });
              navigate("/dashboard");
              return;
            }
          }
          toast({ title: "Account created!", description: "Please sign in with your credentials." });
          setIsLogin(true);
        }
      }
    }
    setLoading(false);
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
            <h1 className="auth-title">{isLogin ? "Welcome Back" : "Get Started"}</h1>
            <p className="auth-subtitle">{isLogin ? "Sign in to your secure account" : "Create a secure account for your exams"}</p>
          </div>

          <button type="button" className="btn btn-google" onClick={() => {
            signInWithGoogle().catch(err => {
              toast({ title: "Google Auth Error", description: err.message, variant: "destructive" });
            });
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </button>

          <div className="divider">or</div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">Full Name</label>
                  <input type="text" id="fullName" className="form-input" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="rollNo">Roll No</label>
                  <input type="text" id="rollNo" className="form-input" placeholder="e.g. 2024CS001" value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input type="email" id="email" className="form-input" placeholder="student@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input type="password" id="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            {!isLogin && (
              <p style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '1.5rem', textAlign: 'center' }}>
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
