// src/App.jsx
import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
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
import ArchivedJobs from "./pages/ArchivedJobs";
import CompanyResearch from "./pages/CompanyResearch";
import JobMatch from "./pages/Match/JobMatch";
import MatchCompare from "./pages/Match/MatchCompare.jsx";
import SkillsGapAnalysis from "./pages/SkillsGap/SkillsGapAnalysis";
import Interviews from "./pages/Interviews/Interviews";
import SalaryResearch from "./pages/Salary/SalaryResearch";
import CoverLetter from "./pages/CoverLetter"; // ✅ ADDED (UC-55)

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

// 🔐 Protected Route Wrapper
function ProtectedRoute({ children }) {
  const authed = !!localStorage.getItem("token");

  return authed ? children : <Navigate to="/login" replace />;
}

// ---------- Root App ----------
export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Router>
          <MainLayout />
        </Router>
      </ProfileProvider>
    </AuthProvider>
  );
}

// ---------- Layout Shell (NavBar + Routes) ----------
function MainLayout() {
  const [loading] = useState(false);
  const navigate = useNavigate();

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
          {/* --- Archived Jobs (Protected) --- */}
          <Route
            path="/archived"
            element={
              <ProtectedRoute>
                <ArchivedJobs />
              </ProtectedRoute>
            }
          />
          {/* --- Company Research (Protected) --- */}
          <Route
            path="/company-research"
            element={
              <ProtectedRoute>
                <CompanyResearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/salary-research"
            element={
              <ProtectedRoute>
                <SalaryResearch />
              </ProtectedRoute>
            }
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
          {/* --- Interviews (Protected) --- */}
          <Route
            path="/interviews"
            element={
              <ProtectedRoute>
                <Interviews />
              </ProtectedRoute>
            }
          />
          {/* --- Cover Letter (UC-055)  --- */}
          <Route path="/cover-letter" element={<CoverLetter />} />{" "}
          {/* ✅ NEW */}
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
