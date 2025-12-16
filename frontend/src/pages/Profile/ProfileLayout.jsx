// src/pages/Profile/ProfileLayout.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProfileNavBar from "../../components/ProfileNavBar";
import InfoTab from "./InfoTab";
import EmploymentTab from "./EmploymentTab";
import SkillsTab from "./SkillsTab";
import EducationTab from "./EducationTab";
import CertificationsTab from "./CertificationsTab";
import ProjectsTab from "./ProjectsTab";
import GitHubTab from "./GitHubTab";
import JobsTab from "./JobsTab";
import DashboardTab from "./DashboardTab";
import DangerTab from "./DangerTab";
import { useAuth } from "../../contexts/AuthContext";
import MentorTab from "./MentorTab";
import TeamManagement from "./TeamManagement";
import ArchivedJobs from "../ArchivedJobs";
import "./ProfileLayout.css";

export default function ProfileLayout() {
  const { authed } = useAuth();

  if (!authed) {
    return (
      <div className="profile-layout">
        <div className="profile-content">
          <div className="profile-box">
            <p style={{ color: "#1f2937" }}>You must log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      <div className="profile-header">
        <h1 className="profile-main-title">My Profile</h1>
        <p className="profile-main-subtitle">Manage your professional information and career details</p>
      </div>

      {/* Navigation Container */}
      <div className="profile-nav-container">
        <ProfileNavBar />
      </div>

      {/* Content Area */}
      <div className="profile-content">
        <Routes>
          {/* Default → Info tab */}
          <Route index element={<InfoTab />} />
          <Route path="info" element={<InfoTab />} />

          {/* Core Profile Tabs */}
          <Route path="dashboard" element={<DashboardTab />} />
          <Route path="archived" element={<ArchivedJobs />} />
          <Route path="employment" element={<EmploymentTab />} />
          <Route path="skills" element={<SkillsTab />} />
          <Route path="education" element={<EducationTab />} />
          <Route path="certifications" element={<CertificationsTab />} />
          <Route path="projects" element={<ProjectsTab />} />
          <Route path="github" element={<GitHubTab />} />
          <Route path="jobs" element={<JobsTab />} />

          <Route path="team" element={<TeamManagement />} />

          <Route path="danger" element={<DangerTab />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/profile/info" replace />} />
        </Routes>
      </div>
    </div>
  );
}
