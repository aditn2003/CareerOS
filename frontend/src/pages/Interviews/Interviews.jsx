import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./Interviews.css";

export default function Interviews() {
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState("");
  
  // Tab state: "insights" or "questions"
  const [activeTab, setActiveTab] = useState("insights");

  // Role mapping by company
  const [roleMap, setRoleMap] = useState({});

  // Interview Insights state
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Checklist progress
  const [checked, setChecked] = useState({});

  // 🆕 UC-075: Question Bank state
  const [questionFilters, setQuestionFilters] = useState({
    role: "",
    industry: "Technology",
    difficulty: "all",
    category: "all"
  });
  const [questionBank, setQuestionBank] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [practicedQuestions, setPracticedQuestions] = useState(new Set());
  const [practicedDetails, setPracticedDetails] = useState([]); // Full practiced question data
  const [practiceStats, setPracticeStats] = useState(null);
  const [showReviewSection, setShowReviewSection] = useState(false);

  // TODO: Replace with your actual user ID from auth context
  const userId = 1; // Get from your auth system

  /* ============================================================
     Load JOBS → build unique company list & role list per company
  ============================================================ */
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/jobs");
        const jobs = res.data.jobs || [];

        const uniqueCompanies = [...new Set(jobs.map((j) => j.company))];
        setCompanies(uniqueCompanies);

        const roleMapTemp = {};
        jobs.forEach((job) => {
          if (!roleMapTemp[job.company]) roleMapTemp[job.company] = new Set();
          roleMapTemp[job.company].add(job.title);
        });

        const finalMap = {};
        Object.keys(roleMapTemp).forEach((company) => {
          finalMap[company] = [...roleMapTemp[company]];
        });

        setRoleMap(finalMap);

        if (uniqueCompanies.length > 0) {
          setActiveCompany(uniqueCompanies[0]);
          // Set default role for question bank
          const firstRole = finalMap[uniqueCompanies[0]]?.[0] || "";
          setQuestionFilters(prev => ({ ...prev, role: firstRole }));
        }
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, []);

  /* ============================================================
     Load interview insights when company changes
  ============================================================ */
  useEffect(() => {
    if (!activeCompany || activeTab !== "insights") return;
    fetchInsights(activeCompany);
  }, [activeCompany, activeTab]);

  /* ============================================================
     Fetch insights
  ============================================================ */
  async function fetchInsights(company) {
    try {
      setInsightsLoading(true);
      const role = roleMap[company]?.[0] || "";
      
      const res = await api.get(
        `/api/interview-insights?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`
      );

      setInsights(res.data.data);

      const saved = JSON.parse(
        localStorage.getItem(`checklist_${company}_${role}`) || "{}"
      );
      setChecked(saved);
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }

  /* ============================================================
     🆕 UC-075: Fetch Question Bank - Shows Practiced + New
  ============================================================ */
  async function fetchQuestionBank() {
    if (!questionFilters.role) return;
    
    try {
      setQuestionsLoading(true);
      
      // Fetch new questions from OpenAI
      const res = await api.get("/api/interview-insights/questions", {
        params: {
          role: questionFilters.role,
          industry: questionFilters.industry,
          difficulty: questionFilters.difficulty
        }
      });

      setQuestionBank(res.data.data.questionBank);
      
      // Fetch practiced questions to show which ones are done
      await fetchPracticedQuestions();
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setQuestionsLoading(false);
    }
  }

  /* ============================================================
     🆕 UC-075: Fetch Practiced Questions
  ============================================================ */
  async function fetchPracticedQuestions() {
    try {
      const res = await api.get("/api/interview-insights/questions/practiced", {
        params: { userId }
      });
      const practiced = res.data.data.practicedQuestions || [];
      const practicedIds = new Set(practiced.map(q => q.question_id));
      setPracticedQuestions(practicedIds);
      setPracticedDetails(practiced); // Save full details for review section
    } catch (err) {
      console.error("Error fetching practiced questions:", err);
    }
  }

  /* ============================================================
     🆕 UC-075: Fetch Practice Statistics
  ============================================================ */
  async function fetchPracticeStats() {
    try {
      const res = await api.get("/api/interview-insights/questions/stats", {
        params: { userId }
      });
      setPracticeStats(res.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  /* ============================================================
     🆕 UC-075: Load questions when tab switches or company/filters change
  ============================================================ */
  useEffect(() => {
    if (activeTab === "questions" && questionFilters.role) {
      fetchQuestionBank();
      fetchPracticedQuestions();
      fetchPracticeStats();
    }
  }, [activeTab, activeCompany]);

  /* ============================================================
     🆕 UC-075: Mark Question as Practiced
  ============================================================ */
  async function markAsPracticed(questionId, category, response = null) {
    try {
      await api.post("/api/interview-insights/questions/practice", {
        userId,
        questionId,
        questionCategory: category,
        response
      });
      
      setPracticedQuestions(prev => new Set([...prev, questionId]));
      fetchPracticeStats(); // Refresh stats
    } catch (err) {
      console.error("Error marking as practiced:", err);
      alert("Failed to save practice. Please try again.");
    }
  }

  /* ============================================================
     Checklist handler
  ============================================================ */
  function toggleChecklist(i) {
    const role = roleMap[activeCompany]?.[0] || "";
    const updated = { ...checked, [i]: !checked[i] };
    setChecked(updated);
    localStorage.setItem(
      `checklist_${activeCompany}_${role}`,
      JSON.stringify(updated)
    );
  }

  /* ============================================================
     Refresh
  ============================================================ */
  function refresh() {
    if (activeTab === "insights") {
      if (activeCompany) fetchInsights(activeCompany);
    } else {
      fetchQuestionBank();
      fetchPracticedQuestions();
      fetchPracticeStats();
    }
  }

  /* ============================================================
     Get filtered questions by category
  ============================================================ */
  function getFilteredQuestions() {
    if (!questionBank) return [];
    
    if (questionFilters.category === "all") {
      return [
        ...(questionBank.behavioral || []),
        ...(questionBank.technical || []),
        ...(questionBank.situational || []),
        ...(questionBank.company_specific || [])
      ];
    }
    
    return questionBank[questionFilters.category] || [];
  }

  const filteredQuestions = getFilteredQuestions();

  /* ============================================================
     RENDER UI
  ============================================================ */
  return (
    <div className="interviews-container">
      <h1 className="interview-title">Interview Preparation</h1>

      {/* === Tab Navigation === */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          📊 Interview Insights
        </button>
        <button
          className={`tab-btn ${activeTab === "questions" ? "active" : ""}`}
          onClick={() => setActiveTab("questions")}
        >
          📝 Question Bank
        </button>
      </div>

      {/* ============================================================
          TAB 1: INTERVIEW INSIGHTS (Existing functionality)
      ============================================================ */}
      {activeTab === "insights" && (
        <>
          <div className="company-buttons">
            {companies.map((c) => (
              <button
                key={c}
                className={`company-btn ${c === activeCompany ? "active" : ""}`}
                onClick={() => setActiveCompany(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <button className="refresh-btn" onClick={refresh}>
            🔄 Refresh Insights
          </button>

          <div className="insights-panel">
            {insightsLoading && <p className="loading-text">⏳ Loading interview insights…</p>}

            {!insightsLoading && insights && (
              <div className="interview-content">
                <h2 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "20px" }}>
                  {activeCompany} — Interview Overview
                </h2>

                <section>
                  <h2>Interview Process Overview</h2>
                  <p>{insights.process}</p>
                </section>

                <section>
                  <h2>Typical Stages</h2>
                  <ul>
                    {insights.stages.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Common Interview Questions</h2>
                  <ul>
                    {insights.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Interviewer Backgrounds</h2>
                  <ul>
                    {insights.interviewers.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Company-Specific Interview Format</h2>
                  <p>{insights.format}</p>
                </section>

                <section>
                  <h2>Preparation Recommendations</h2>
                  <ul>
                    {insights.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Timeline & Expectations</h2>
                  <p>{insights.timeline}</p>
                </section>

                <section>
                  <h2>Success Tips</h2>
                  <ul>
                    {insights.tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Interview Preparation Checklist</h2>
                  {insights.checklist.map((item, i) => (
                    <label key={i} className="checklist-item">
                      <input
                        type="checkbox"
                        checked={checked[i] || false}
                        onChange={() => toggleChecklist(i)}
                      />
                      {item}
                    </label>
                  ))}
                </section>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          TAB 2: QUESTION BANK (🆕 UC-075)
      ============================================================ */}
      {activeTab === "questions" && (
        <>
          {/* Company Selection Buttons */}
          <div className="company-buttons">
            {companies.map((c) => (
              <button
                key={c}
                className={`company-btn ${c === activeCompany ? "active" : ""}`}
                onClick={() => {
                  setActiveCompany(c);
                  // Auto-populate role from this company's first job
                  const role = roleMap[c]?.[0] || "";
                  setQuestionFilters(prev => ({ ...prev, role }));
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Practice Statistics */}
          {practiceStats && (
            <div className="stats-card">
              <h3>📊 Your Practice Progress</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{practiceStats.totalPracticed}</div>
                  <div className="stat-label">Questions Practiced</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{practiceStats.withResponses}</div>
                  <div className="stat-label">Written Responses</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {practiceStats.totalPracticed > 0
                      ? Math.round((practiceStats.withResponses / practiceStats.totalPracticed) * 100)
                      : 0}%
                  </div>
                  <div className="stat-label">Completion Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Review Your Responses Section */}
          {practicedDetails.length > 0 && (
            <div className="review-section">
              <button 
                className="review-toggle-btn"
                onClick={() => setShowReviewSection(!showReviewSection)}
              >
                {showReviewSection ? "▼" : "▶"} Review Your Past Responses ({practicedDetails.length})
              </button>
              
              {showReviewSection && (
                <div className="review-content">
                  {practicedDetails.map((q) => (
                    <div key={q.id} className="review-card">
                      <div className="review-header">
                        <span className="review-category">{q.question_category}</span>
                        <span className="review-date">
                          {new Date(q.practiced_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="review-response">
                        <strong>Your Response:</strong>
                        <p>{q.response || "No written response"}</p>
                      </div>
                      <div className="review-meta">
                        {q.response_length} characters
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="filters-card">
            <div className="filter-row">
              <div className="filter-group">
                <label>Target Role</label>
                <input
                  type="text"
                  value={questionFilters.role}
                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div className="filter-group">
                <label>Industry</label>
                <select
                  value={questionFilters.industry}
                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, industry: e.target.value }))}
                >
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Consulting">Consulting</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Difficulty</label>
                <select
                  value={questionFilters.difficulty}
                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="all">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                </select>
              </div>

              <button className="generate-btn" onClick={fetchQuestionBank}>
                🔄 Generate Questions
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          {questionBank && (
            <div className="category-tabs">
              <button
                className={`category-tab ${questionFilters.category === "all" ? "active" : ""}`}
                onClick={() => setQuestionFilters(prev => ({ ...prev, category: "all" }))}
              >
                All ({filteredQuestions.length})
              </button>
              <button
                className={`category-tab ${questionFilters.category === "behavioral" ? "active" : ""}`}
                onClick={() => setQuestionFilters(prev => ({ ...prev, category: "behavioral" }))}
              >
                👥 Behavioral ({questionBank.behavioral?.length || 0})
              </button>
              <button
                className={`category-tab ${questionFilters.category === "technical" ? "active" : ""}`}
                onClick={() => setQuestionFilters(prev => ({ ...prev, category: "technical" }))}
              >
                💻 Technical ({questionBank.technical?.length || 0})
              </button>
              <button
                className={`category-tab ${questionFilters.category === "situational" ? "active" : ""}`}
                onClick={() => setQuestionFilters(prev => ({ ...prev, category: "situational" }))}
              >
                🤔 Situational ({questionBank.situational?.length || 0})
              </button>
              <button
                className={`category-tab ${questionFilters.category === "company_specific" ? "active" : ""}`}
                onClick={() => setQuestionFilters(prev => ({ ...prev, category: "company_specific" }))}
              >
                🏢 Company ({questionBank.company_specific?.length || 0})
              </button>
            </div>
          )}

          {/* Questions List */}
          <div className="insights-panel">
            {questionsLoading && <p className="loading-text">⏳ Generating questions...</p>}

            {!questionsLoading && !questionBank && (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>Get Started</h3>
                <p>Enter your target role and generate personalized interview questions</p>
              </div>
            )}

            {!questionsLoading && questionBank && filteredQuestions.length === 0 && (
              <p className="loading-text">No questions found for selected filters.</p>
            )}

            {!questionsLoading && filteredQuestions.length > 0 && (
              <div className="questions-list">
                {filteredQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    isPracticed={practicedQuestions.has(q.id)}
                    onMarkPracticed={markAsPracticed}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   🆕 UC-075: Question Card Component
============================================================ */
function QuestionCard({ question, isPracticed, onMarkPracticed }) {
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSavePractice = async () => {
    if (!response.trim() && !isPracticed) {
      alert("Please write a response before marking as practiced");
      return;
    }

    setSaving(true);
    try {
      await onMarkPracticed(question.id, question.category, response);
      setShowResponse(false);
      setResponse("");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMark = async () => {
    setSaving(true);
    try {
      await onMarkPracticed(question.id, question.category, null);
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "entry": return "#10b981";
      case "mid": return "#f59e0b";
      case "senior": return "#ef4444";
      default: return "#6b7280";
    }
  };

  return (
    <div className={`question-card ${isPracticed ? "practiced" : ""}`}>
      <div className="question-header">
        <div className="question-badges">
          <span className="category-badge">{question.category}</span>
          <span
            className="difficulty-badge"
            style={{ background: getDifficultyColor(question.difficulty) }}
          >
            {question.difficulty}
          </span>
          {isPracticed && <span className="practiced-badge">✓ Practiced</span>}
        </div>
      </div>

      <div className="question-text">
        <p>{question.question}</p>
      </div>

      {/* STAR Framework for Behavioral */}
      {question.category === "behavioral" && question.sample_structure && (
        <div className="star-framework">
          <h4>💡 STAR Framework:</h4>
          <p>{question.sample_structure}</p>
        </div>
      )}

      {/* Technical Details */}
      {question.category === "technical" && (
        <div className="technical-details">
          {question.concepts && (
            <div>
              <strong>Key Concepts:</strong>
              <div className="concept-tags">
                {question.concepts.map((c, i) => (
                  <span key={i} className="concept-tag">{c}</span>
                ))}
              </div>
            </div>
          )}
          {question.skills_tested && (
            <div>
              <strong>Skills Tested:</strong>
              <div className="concept-tags">
                {question.skills_tested.map((s, i) => (
                  <span key={i} className="concept-tag">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="question-actions">
        {!isPracticed && (
          <>
            <button className="btn-primary" onClick={() => setShowResponse(!showResponse)}>
              {showResponse ? "Cancel" : "✍️ Write Response"}
            </button>
            <button className="btn-secondary" onClick={handleQuickMark} disabled={saving}>
              {saving ? "Saving..." : "✓ Mark as Practiced"}
            </button>
          </>
        )}
        {isPracticed && (
          <div className="practiced-message">✓ You've practiced this question</div>
        )}
      </div>

      {/* Response Textarea */}
      {showResponse && !isPracticed && (
        <div className="response-section">
          <label>Your Response (STAR format recommended):</label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Situation: Describe the context...&#10;Task: What was your responsibility...&#10;Action: What steps did you take...&#10;Result: What was the outcome..."
            rows={8}
          />
          <div className="response-actions">
            <button className="btn-save" onClick={handleSavePractice} disabled={saving || !response.trim()}>
              {saving ? "Saving..." : "💾 Save & Mark as Practiced"}
            </button>
            <span className="char-count">{response.length} characters</span>
          </div>
        </div>
      )}
    </div>
  );
}