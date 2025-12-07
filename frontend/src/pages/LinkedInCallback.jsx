// src/pages/LinkedInCallback.jsx
// Dedicated page to handle LinkedIn OAuth callback
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LinkedInCallback() {
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing LinkedIn login...");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function processLogin() {
      // Read token and profile from URL params
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const profileStr = params.get('profile');

      console.log("LinkedIn callback - token:", token ? "present" : "missing");
      console.log("LinkedIn callback - profile:", profileStr ? "present" : "missing");

      if (!token) {
        setError("No authentication token received. Please try again.");
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Parse profile if present
        let profile = null;
        if (profileStr) {
          profile = JSON.parse(decodeURIComponent(profileStr));
          console.log("LinkedIn profile:", profile);
          // Store LinkedIn profile in localStorage for display
          localStorage.setItem("linkedinProfile", JSON.stringify(profile));
        }
        
        setStatus("Logging you in...");

        // Save the token
        setToken(token);
        localStorage.setItem("token", token);
        
        const payload = JSON.parse(atob(token.split(".")[1]));
        localStorage.setItem("userId", payload.id);

        console.log("User logged in with ID:", payload.id);

        setStatus("✅ Success! Redirecting...");
        
        // Redirect to profile
        setTimeout(() => {
          navigate("/profile/info");
        }, 500);
      } catch (err) {
        console.error("LinkedIn login error:", err);
        setError(err.message || "Login failed");
        setTimeout(() => navigate('/login'), 3000);
      }
    }

    processLogin();
  }, [navigate, setToken]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        {error ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p style={{ fontSize: '18px', margin: 0 }}>{error}</p>
            <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
              Redirecting to login...
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {status.includes('Success') ? '✅' : '🔗'}
            </div>
            <p style={{ fontSize: '18px', margin: 0 }}>{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

