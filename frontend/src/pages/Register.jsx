// src/pages/Register.jsx
import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import LegalModal from "../components/LegalModal";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaCheck } from "react-icons/fa";
import "./Auth.css";

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "candidate",
  });
  const [legalModal, setLegalModal] = useState({ open: false, type: null });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  // Password strength calculator
  const passwordStrength = useMemo(() => {
    const password = form.password;
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
    if (score <= 2) return { score: 2, label: "Fair", color: "#f97316" };
    if (score <= 3) return { score: 3, label: "Good", color: "#eab308" };
    if (score <= 4) return { score: 4, label: "Strong", color: "#22c55e" };
    return { score: 5, label: "Excellent", color: "#10b981" };
  }, [form.password]);

  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordsDontMatch = form.password && form.confirmPassword && form.password !== form.confirmPassword;
  const emailValid = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordTooShort = form.password && form.password.length < 8;

  async function handleRegister() {
    if (form.password !== form.confirmPassword) {
      alert("❌ Passwords don't match");
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.post("/register", {
        ...form,
        accountType: form.accountType || "candidate",
      });
      setToken(data.token);
      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-decoration auth-decoration-1"></div>
        <div className="auth-decoration auth-decoration-2"></div>
        
        <h2>Create Account</h2>
        <p className="auth-subtitle">Start your career journey with CareerOS</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label htmlFor="reg-first-name">First name</label>
            <div className="input-with-icon">
              <FaUser className="input-icon" />
              <input
                id="reg-first-name"
                placeholder="John"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                aria-label="First name"
                aria-required="true"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reg-last-name">Last name</label>
            <div className="input-with-icon">
              <FaUser className="input-icon" />
              <input
                id="reg-last-name"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                aria-label="Last name"
                aria-required="true"
              />
            </div>
          </div>
        </div>

        <label htmlFor="reg-email">Email</label>
        <div className="input-with-icon">
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            id="reg-email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            aria-label="Email address"
            aria-required="true"
            style={form.email && !emailValid ? { borderColor: "#ef4444" } : {}}
          />
        </div>
        {form.email && !emailValid && (
          <span className="input-error">Please enter a valid email address</span>
        )}

        <label htmlFor="reg-password">Password</label>
        <div className="input-with-icon">
          <FaLock className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            id="reg-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            aria-label="Password"
            aria-required="true"
          />
          <button 
            type="button" 
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        
        {form.password && (
          <div className="password-strength">
            <div className="strength-bars">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className="strength-bar"
                  style={{
                    backgroundColor: level <= passwordStrength.score ? passwordStrength.color : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <span className="strength-label" style={{ color: passwordStrength.color }}>
              {passwordStrength.label}
            </span>
          </div>
        )}
        {passwordTooShort && (
          <span className="input-error">Password must be at least 8 characters</span>
        )}

        <label htmlFor="reg-confirm-password">Confirm password</label>
        <div className="input-with-icon">
          <FaLock className="input-icon" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="reg-confirm-password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            aria-label="Confirm password"
            aria-required="true"
            style={passwordsMatch ? { borderColor: "#22c55e" } : passwordsDontMatch ? { borderColor: "#ef4444" } : {}}
          />
          <button 
            type="button" 
            className="password-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
          {passwordsMatch && <FaCheck className="input-check" />}
        </div>
        {passwordsDontMatch && (
          <span className="input-error">Passwords don't match</span>
        )}
        {passwordsMatch && (
          <span className="input-success">Passwords match!</span>
        )}

        <label htmlFor="reg-account-type">Account type</label>
        <select
          id="reg-account-type"
          value={form.accountType}
          onChange={(e) => setForm({ ...form, accountType: e.target.value })}
          aria-label="Account type"
        >
          <option value="candidate">Job Seeker</option>
          <option value="mentor">Team Mentor / Coach</option>
        </select>

        <div className="auth-buttons">
          <button className="auth-btn-primary" onClick={handleRegister} disabled={isLoading}>
            {isLoading ? <span className="btn-spinner"></span> : "Create Account"}
          </button>
          <button className="auth-btn-secondary" onClick={() => navigate("/login")}>
            Sign In
          </button>
        </div>

        <div className="auth-legal">
          By creating an account, you agree to our{" "}
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
