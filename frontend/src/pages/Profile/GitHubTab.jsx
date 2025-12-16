// src/pages/Profile/GitHubTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import GitHubSection from "../../components/GitHubSection";

export default function GitHubTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box">
      <h3>GitHub</h3>
      <p>
        Showcase your GitHub projects to demonstrate technical skills to potential employers.
        Connect your GitHub account to import repositories, track contributions, and link projects to your skills.
      </p>

      <GitHubSection token={token} />
    </div>
  );
}

