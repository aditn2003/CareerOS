// src/pages/Profile/DashboardTab.jsx
import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import ProfileDashboard from "../../components/ProfileDashboard";

export default function DashboardTab() {
  const { token } = useAuth();

  return (
    <div className="profile-box" style={{ background: 'transparent', padding: 0 }}>
      <ProfileDashboard token={token} />
    </div>
  );
}
