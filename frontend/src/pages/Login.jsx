// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { api, baseURL } from "../api";
import LegalModal from "../components/LegalModal";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Auth.css";

export default function Login() {
  const { setToken } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [legalModal, setLegalModal] = useState({ open: false, type: null });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle LinkedIn OAuth - check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('linkedin_token');
    const profileStr = params.get('linkedin_profile');
    
    if (!token) return;
    
    let profile = null;
    if (profileStr) {
      try {
        profile = JSON.parse(decodeURIComponent(profileStr));
        localStorage.setItem("linkedinProfile", JSON.stringify(profile));
      } catch (e) {
        console.error("Error parsing profile:", e);
      }
    }
    
    localStorage.setItem("token", token);
    const payload = JSON.parse(atob(token.split(".")[1]));
    localStorage.setItem("userId", payload.id);
    
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ 
        type: 'linkedin_login_success', 
        token, 
        profile,
        userId: payload.id 
      }, window.location.origin);
      window.close();
      return;
    }
    
    setToken(token);
    alert("✅ LinkedIn login successful!");
    navigate("/profile/info");
  }, [navigate, setToken]);
  
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'linkedin_login_success') return;
      
      const { token, profile } = event.data;
      setToken(token);
      
      if (profile) {
        localStorage.setItem("linkedinProfile", JSON.stringify(profile));
      }
      
      alert("✅ LinkedIn login successful!");
      navigate("/profile/info");
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate, setToken]);

  async function handleLogin(e) {
    if (e) {
      e.preventDefault();
    }
    if (isLoading) return; // Prevent double submission
    
    setIsLoading(true);
    try {
      const { data } = await api.post("/login", form);
      setToken(data.token);
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem("userId", payload.id);
      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const idToken = credentialResponse.credential;
      const { data } = await api.post("/google", { idToken });
      alert("✅ Google login successful!");
      setToken(data.token);
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem("userId", payload.id);
      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "Google login failed");
    }
  }

  function handleGoogleError() {
    alert("Google sign-in failed. Try again.");
  }

  function handleLinkedInLogin() {
    const width = 500;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;
    window.open(
      `${baseURL}/api/linkedin/auth`,
      "linkedin_login",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-decoration auth-decoration-1"></div>
        <div className="auth-decoration auth-decoration-2"></div>
        
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue your job search journey</p>

        <div className="auth-help-top">
          <Link to="/getting-started">New here? Get Started →</Link>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email</label>
          <div className="input-with-icon">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              id="login-email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-label="Email address"
              aria-required="true"
            />
          </div>

          <label htmlFor="login-password">Password</label>
          <div className="input-with-icon">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleLogin(e);
                }
              }}
              aria-label="Password"
              aria-required="true"
            />
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="auth-buttons">
            <button type="submit" className="auth-btn-primary" disabled={isLoading}>
              {isLoading ? <span className="btn-spinner"></span> : "Sign In"}
            </button>
            <button type="button" className="auth-btn-secondary" onClick={() => navigate("/register")}>
              Register
            </button>
          </div>
        </form>

        <div className="auth-forgot-link">
          <Link to="/forgot">Forgot password?</Link>
        </div>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="auth-social-buttons">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            shape="pill"
          />
          
          <button
            onClick={handleLinkedInLogin}
            disabled={linkedInLoading}
            style={{
              background: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "0.5rem 1.25rem",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: linkedInLoading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 8px rgba(10, 102, 194, 0.25)",
              transition: "all 0.2s",
              width: "auto",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            {linkedInLoading ? "..." : "LinkedIn"}
          </button>
        </div>

        <div className="auth-legal">
          By signing in, you agree to our{" "}
          <span 
            className="legal-link"
            onClick={() => setLegalModal({ open: true, type: "terms" })}
          >
            Terms of Service
          </span>{" "}
          and{" "}
          <span 
            className="legal-link"
            onClick={() => setLegalModal({ open: true, type: "privacy" })}
          >
            Privacy Policy
          </span>.
        </div>

        <LegalModal
          isOpen={legalModal.open}
          type={legalModal.type}
          onClose={() => setLegalModal({ open: false, type: null })}
        />
      </div>
    </div>
  );
}
