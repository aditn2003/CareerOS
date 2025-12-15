// src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api";

export default function Login() {
  const { setToken } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const navigate = useNavigate();

  // Handle LinkedIn OAuth - check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('linkedin_token');
    const profileStr = params.get('linkedin_profile');
    
    if (!token) return; // No LinkedIn token, normal login page
    
    console.log("LinkedIn token found in URL!");
    
    // Parse profile
    let profile = null;
    if (profileStr) {
      try {
        profile = JSON.parse(decodeURIComponent(profileStr));
        localStorage.setItem("linkedinProfile", JSON.stringify(profile));
      } catch (e) {
        console.error("Error parsing profile:", e);
      }
    }
    
    // Save the token to localStorage (accessible by all windows on same origin)
    localStorage.setItem("token", token);
    const payload = JSON.parse(atob(token.split(".")[1]));
    localStorage.setItem("userId", payload.id);
    
    // Check if we're in a popup
    if (window.opener && !window.opener.closed) {
      // Send message to opener window
      window.opener.postMessage({ 
        type: 'linkedin_login_success', 
        token, 
        profile,
        userId: payload.id 
      }, window.location.origin);
      
      // Close the popup
      window.close();
      return;
    }
    
    // Not in a popup - process directly
    setToken(token);
    console.log("LinkedIn login successful, user ID:", payload.id);
    alert("✅ LinkedIn login successful!");
    navigate("/profile/info");
  }, [navigate, setToken]);
  
  // Listen for messages from popup
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'linkedin_login_success') return;
      
      console.log("Received LinkedIn login from popup!");
      const { token, profile, userId } = event.data;
      
      // Token is already in localStorage, just update React state
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

  async function handleLogin() {
    try {
      const { data } = await api.post("/login", form);

      alert("✅ Login successful!");
      setToken(data.token);

      // 🔥 Save userId
      const payload = JSON.parse(atob(data.token.split(".")[1]));
      localStorage.setItem("userId", payload.id);

      navigate("/profile/info");
    } catch (e) {
      alert(e?.response?.data?.error || "❌ Login failed");
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const idToken = credentialResponse.credential;
      const { data } = await api.post("/google", { idToken });

      alert("✅ Google login successful!");
      setToken(data.token);

      // 🔥 Save userId
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
    // Open LinkedIn OAuth in a popup window
    const width = 500;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    window.open(
      "http://localhost:4000/api/linkedin/auth",
      "linkedin_login",
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }

  return (
    <section>
      <h2>Login</h2>

      <label htmlFor="login-email">Email</label>
      <input
        type="email"
        id="login-email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        aria-label="Email address"
        aria-required="true"
      />

      <label htmlFor="login-password">Password</label>
      <input
        type="password"
        id="login-password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        aria-label="Password"
        aria-required="true"
      />

      <button onClick={handleLogin}>Login</button>

      <div className="text-small">
        <Link to="/forgot">Forgot password?</Link>
      </div>

      <div style={{ marginTop: "10px" }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          shape="pill"
        />
      </div>

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={handleLinkedInLogin}
          disabled={linkedInLoading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#0A66C2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: linkedInLoading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          {linkedInLoading ? "Signing in..." : "Sign in with LinkedIn"}
        </button>
      </div>
    </section>
  );
}
