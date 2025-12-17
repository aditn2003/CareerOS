// src/App.jsx
import React, { useState, lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import NavBar from "./components/NavBar";
import Spinner from "./components/Spinner";
import "./App.css";

// ---------- Pages (Lazy Loaded for Code Splitting) ----------
const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ProfileLayout = lazy(() => import("./pages/Profile/ProfileLayout"));
const Jobs = lazy(() => import("./pages/Jobs"));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage"));
const CompanyResearch = lazy(() =>
  import("./pages/Interviews/CompanyResearch")
); // 🆕 Moved to Interviews folder
const JobMatch = lazy(() => import("./pages/Match/JobMatch"));
const MatchCompare = lazy(() => import("./pages/Match/MatchCompare.jsx"));
const SkillsGapAnalysis = lazy(() =>
  import("./pages/SkillsGap/SkillsGapAnalysis")
);
const Interviews = lazy(() => import("./pages/Interviews/Interviews"));
const CoverLetter = lazy(() => import("./pages/CoverLetter")); // ✅ ADDED (UC-55)
const NetworkLayout = lazy(() => import("./pages/Network/NetworkLayout")); // ✅ ADDED (Consolidated Network/Referrals/Networking)
const InterviewsLayout = lazy(() =>
  import("./pages/Interviews/InterviewsLayout")
); // Layout wrapper
const InterviewInsights = lazy(() =>
  import("./pages/Interviews/InterviewInsights")
); // ✅ UC-074
const QuestionBank = lazy(() => import("./pages/Interviews/QuestionBank")); // ✅ UC-075
const ResponseCoaching = lazy(() =>
  import("./pages/Interviews/ResponseCoaching")
); // ✅ UC-076
const MockInterview = lazy(() => import("./pages/Interviews/MockInterview")); // ✅ UC-077
const TechnicalPrep = lazy(() => import("./pages/Interviews/TechnicalPrep")); // ✅ UC-078
const FollowUpTemplates = lazy(() =>
  import("./pages/Interviews/FollowUpTemplates")
); // ✅ UC-082
const SalaryResearch = lazy(() => import("./pages/Interviews/SalaryResearch")); // 🆕 Moved to Interviews folder
const SalaryNegotiation = lazy(() =>
  import("./pages/Interviews/SalaryNegotiation")
); // ✅ UC-083
const MentorLayout = lazy(() => import("./pages/Mentor/MentorLayout")); // ✅ Mentor layout with tabs
const InterviewAnalytics = lazy(() =>
  import("./pages/Interviews/InterviewAnalytics")
);
const InterviewTracker = lazy(() =>
  import("./pages/Interviews/InterviewTracker")
);
const LinkedInAuthSuccess = lazy(() => import("./pages/LinkedInAuthSuccess")); // LinkedIn OAuth callback handler
const LinkedInCallback = lazy(() => import("./pages/LinkedInCallback")); // LinkedIn OAuth callback (new)
const DocsManagement = lazy(() => import("./pages/DocsManagement"));

// ---------- Help & Legal Pages (Lazy) ----------
const GettingStarted = lazy(() => import("./pages/Help/GettingStarted"));
const FAQ = lazy(() => import("./pages/Help/FAQ"));
const TermsOfService = lazy(() => import("./pages/Help/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/Help/PrivacyPolicy"));

// ---------- Components (Lazy) ----------
const FollowUpReminders = lazy(() => import("./components/FollowUpReminders"));

// ---------- Admin Pages (Lazy) ----------
const ApiMonitoringDashboard = lazy(() => import("./pages/Admin/ApiMonitoringDashboard"));

const Networking = lazy(
  () => import("./pages/Networking/Networking")
); // Professional Networking Management

// ---------- Resume Flow (Lazy) ----------
const ResumeBuilder = lazy(() => import("./pages/Profile/ResumeBuilder"));
const ResumeSetup = lazy(() => import("./pages/Profile/ResumeSetup"));
const ResumeEditor = lazy(() => import("./components/ResumeEditor"));
const ResumeOptimize = lazy(() => import("./components/ResumeOptimize"));
const ResumeOptimizeRun = lazy(() => import("./components/ResumeOptimizeRun"));
const ResumeCompare = lazy(() => import("./components/ResumeCompare"));
const ResumeFinalReview = lazy(() => import("./components/ResumeFinalReview"));

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
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <NavBar />

      <main id="main-content" className="app-container" role="main">
        {loading && <Spinner />}

        <Suspense fallback={<Spinner />}>
          <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />
          
          {/* --- LinkedIn OAuth Callback Routes --- */}
          <Route path="/auth/linkedin/success" element={<LinkedInAuthSuccess />} />
          <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />

          {/* --- Help & Legal Pages (Public) --- */}
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

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

          {/* --- Jobs Map View (Protected) --- */}
          <Route
            path="/jobs/map"
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

          {/* --- Follow-Up Reminders (UC-118, Protected) --- */}
          <Route
            path="/followup-reminders"
            element={
              <ProtectedRoute>
                <FollowUpReminders />
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

          {/* --- Admin Dashboard (Protected, Mentor/Admin Only) --- */}
          <Route
            path="/admin/api-monitoring"
            element={
              <ProtectedRoute>
                <ApiMonitoringDashboard />
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
        </Suspense>
      </main>
    </div>
  );
}
