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

  // Handle LinkedIn OAuth callback
  useEffect(() => {
    const handleLinkedInMessage = async (event) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "linkedin_token") {
        const { accessToken, expiresIn } = event.data;
        
        try {
          setLinkedInLoading(true);

          // Step 1: Store the token on backend
          await api.post("/linkedin/store-token", {
            accessToken,
            expiresIn,
          });

          // Step 2: Fetch LinkedIn profile data
          const profileRes = await api.get("/linkedin/fetch-profile");
          const linkedInProfile = profileRes.data.profile;

          // Step 3: Create or login user with LinkedIn data
          const loginRes = await api.post("/linkedin-login", {
            linkedin_id: linkedInProfile.linkedin_id,
            email: linkedInProfile.email,
            first_name: linkedInProfile.first_name,
            last_name: linkedInProfile.last_name,
            profile_pic_url: linkedInProfile.profile_pic_url,
          });

          // Step 4: Sync profile data
          if (loginRes.data.token) {
            setToken(loginRes.data.token);
            const payload = JSON.parse(
              atob(loginRes.data.token.split(".")[1])
            );
            localStorage.setItem("userId", payload.id);

            // Sync profile
            await api.post("/linkedin/sync-profile", {
              linkedin_id: linkedInProfile.linkedin_id,
              first_name: linkedInProfile.first_name,
              last_name: linkedInProfile.last_name,
              email: linkedInProfile.email,
              profile_pic_url: linkedInProfile.profile_pic_url,
            });

            alert("✅ LinkedIn login successful!");
            navigate("/profile/info");
          }
        } catch (err) {
          console.error("LinkedIn login error:", err);
          alert(err?.response?.data?.error || "LinkedIn login failed");
        } finally {
          setLinkedInLoading(false);
        }
      }
    };

    window.addEventListener("message", handleLinkedInMessage);
    return () => window.removeEventListener("message", handleLinkedInMessage);
  }, [setToken, navigate]);

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

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
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
