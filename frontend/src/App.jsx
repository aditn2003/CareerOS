// src/App.jsx
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";

// ---------- Pages ----------
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProfileLayout from "./pages/Profile/ProfileLayout";
import Jobs from "./pages/Jobs";
import StatisticsPage from "./pages/StatisticsPage";
import CompanyResearch from "./pages/Interviews/CompanyResearch"; // 🆕 Moved to Interviews folder
import JobMatch from "./pages/Match/JobMatch";
import MatchCompare from "./pages/Match/MatchCompare.jsx";
import SkillsGapAnalysis from "./pages/SkillsGap/SkillsGapAnalysis";
import Interviews from "./pages/Interviews/Interviews";
import CoverLetter from "./pages/CoverLetter"; // ✅ ADDED (UC-55)
import NetworkLayout from "./pages/Network/NetworkLayout"; // ✅ ADDED (Consolidated Network/Referrals/Networking)
import InterviewsLayout from "./pages/Interviews/InterviewsLayout"; // Layout wrapper
import InterviewInsights from "./pages/Interviews/InterviewInsights"; // ✅ UC-074
import QuestionBank from "./pages/Interviews/QuestionBank"; // ✅ UC-075
import ResponseCoaching from "./pages/Interviews/ResponseCoaching"; // ✅ UC-076
import MockInterview from "./pages/Interviews/MockInterview"; // ✅ UC-077
import TechnicalPrep from "./pages/Interviews/TechnicalPrep"; // ✅ UC-078
import FollowUpTemplates from "./pages/Interviews/FollowUpTemplates"; // ✅ UC-082
import SalaryResearch from "./pages/Interviews/SalaryResearch"; // 🆕 Moved to Interviews folder
import SalaryNegotiation from "./pages/Interviews/SalaryNegotiation"; // ✅ UC-083
import MentorLayout from "./pages/Mentor/MentorLayout"; // ✅ Mentor layout with tabs
import InterviewAnalytics from './pages/Interviews/InterviewAnalytics';
import InterviewTracker from './pages/Interviews/InterviewTracker';
import DocsManagement from "./pages/DocsManagement";

import Networking from "./pages/Networking/Networking"; // Professional Networking Management

// ---------- Resume Flow ----------
import ResumeBuilder from "./pages/Profile/ResumeBuilder";
import ResumeSetup from "./pages/Profile/ResumeSetup";
import ResumeEditor from "./components/ResumeEditor";
import ResumeOptimize from "./components/ResumeOptimize";
import ResumeOptimizeRun from "./components/ResumeOptimizeRun";
import ResumeCompare from "./components/ResumeCompare";
import ResumeFinalReview from "./components/ResumeFinalReview";

// ---------- Context Providers ----------
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { TeamProvider } from "./contexts/TeamContext";

// 🔐 Protected Route Wrapper
function ProtectedRoute({ children }) {
  const authed = !!localStorage.getItem("token");
  return authed ? children : <Navigate to="/login" replace />;
}

// ---------- Root App ----------
export default function App() {
  return (
    <AuthProvider>
      <TeamProvider>
      <ProfileProvider>
        <Router>
          <MainLayout />
        </Router>
      </ProfileProvider>
      </TeamProvider>
    </AuthProvider>
  );
}

// ---------- Layout Shell (NavBar + Routes) ----------
function MainLayout() {
  const [loading] = useState(false);

  return (
    <div className="app-wrapper">
      <NavBar />

      <main className="app-container">
        {loading && <Spinner />}

        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />

          {/* --- Profile Routes (Protected) --- */}
          <Route
            path="/profile/*"
            element={
              <ProtectedRoute>
                <ProfileLayout />
              </ProtectedRoute>
            }
          />

          {/* --- Resume Builder Pipeline (Protected) --- */}
          <Route
            path="/resume"
            element={
              <ProtectedRoute>
                <ResumeBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/setup"
            element={
              <ProtectedRoute>
                <ResumeSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/editor"
            element={
              <ProtectedRoute>
                <ResumeEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/optimize"
            element={
              <ProtectedRoute>
                <ResumeOptimize />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/optimize/run"
            element={
              <ProtectedRoute>
                <ResumeOptimizeRun />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/compare"
            element={
              <ProtectedRoute>
                <ResumeCompare />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/final-review"
            element={
              <ProtectedRoute>
                <ResumeFinalReview />
              </ProtectedRoute>
            }
          />

          {/* --- Jobs Dashboard (Protected) --- */}
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />

          {/* --- Statistics (Protected) --- */}
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <StatisticsPage />
              </ProtectedRoute>
            }
          />


          {/* --- Company Research (Redirect to Interviews) --- */}
          <Route
            path="/company-research"
            element={<Navigate to="/interviews/company-research" replace />}
          />

          {/* --- Salary Research (Redirect to Interviews) --- */}
          <Route
            path="/salary-research"
            element={<Navigate to="/interviews/salary-research" replace />}
          />

          {/* --- Job Match (Protected) --- */}
          <Route
            path="/job-match"
            element={
              <ProtectedRoute>
                <JobMatch />
              </ProtectedRoute>
            }
          />

          {/* --- Docs Management (Protected) --- */}
          <Route
            path="/docs-management"
            element={
              <ProtectedRoute>
                <DocsManagement />
              </ProtectedRoute>
            }
          />

          {/* --- Match Compare (Protected) --- */}
          <Route
            path="/match/compare"
            element={
              <ProtectedRoute>
                <MatchCompare />
              </ProtectedRoute>
            }
          />

          {/* --- Skills Gap (Protected) --- */}
          <Route
            path="/skills-gap/:jobId"
            element={
              <ProtectedRoute>
                <SkillsGapAnalysis />
              </ProtectedRoute>
            }
          />

          {/* --- Interview Preparation (Nested + Protected) --- */}
          <Route
            path="/interviews"
            element={
              <ProtectedRoute>
                <InterviewsLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to insights */}
            <Route index element={<Navigate to="insights" replace />} />

            {/* Nested routes */}
            <Route path="insights" element={<InterviewInsights />} />
            <Route path="question-bank" element={<QuestionBank />} />
            <Route path="response-coaching" element={<ResponseCoaching />} />
            <Route path="mock-interview" element={<MockInterview />} />
            <Route path="technical-prep" element={<TechnicalPrep />} /> {/* ✅ UC-078 */}
            <Route path="follow-up" element={<FollowUpTemplates />} />
            <Route path="company-research" element={<CompanyResearch />} /> {/* 🆕 MOVED HERE */}
            <Route path="salary-research" element={<SalaryResearch />} /> {/* 🆕 MOVED HERE */}
            <Route path="salary-negotiation" element={<SalaryNegotiation />} /> {/* ✅ UC-083 */}
            <Route path="tracker" element={<InterviewTracker />} />
            <Route path="analytics" element={<InterviewAnalytics />} />
          </Route>

          {/* --- Cover Letter (UC-055, Protected) --- */}
          <Route
            path="/cover-letter"
            element={
              <ProtectedRoute>
                <CoverLetter />
              </ProtectedRoute>
            }
          />
          {/* --- Cover Letter (UC-055)  --- */}
          <Route path="/cover-letter" element={<CoverLetter />} />{" "}
          {/* ✅ NEW */}
          {/* --- Consolidated Network & Relationships (UC-10x, UC-087, UC-088) --- */}
          <Route
            path="/network"
            element={
              <ProtectedRoute>
                <NetworkLayout />
              </ProtectedRoute>
            }
          />
          {/* --- Legacy Routes (Redirect to /network) --- */}
          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <Navigate to="/network" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/networking"
            element={
              <ProtectedRoute>
                <Navigate to="/network" replace />
              </ProtectedRoute>
            }
          />
          {/* ✅ CONSOLIDATED */}

          {/* --- Mentor Routes (Protected) --- */}
          <Route
            path="/mentor/*"
            element={
              <ProtectedRoute>
                <MentorLayout />
              </ProtectedRoute>
            }
          />

          {/* --- Legacy / Alias --- */}
          <Route
            path="/resume/templates"
            element={
              <ProtectedRoute>
                <Navigate to="/resume" replace />
              </ProtectedRoute>
            }
          />

          {/* --- Fallback --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}