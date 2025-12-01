import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./QuestionBank.css";

export default function QuestionBank() {
  const [questionFilters, setQuestionFilters] = useState({
    role: "Software Engineer",
    industry: "Technology",
    difficulty: "medium",
    category: "all"
  });
  
  const [questionBank, setQuestionBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [practicedQuestions, setPracticedQuestions] = useState(new Set());
  const [practicedDetails, setPracticedDetails] = useState([]);
  const [practiceStats, setPracticeStats] = useState(null);
  const [activeTab, setActiveTab] = useState("practice"); // "practice" or "review"

  const userId = 1; // TODO: Replace with actual user ID from auth

  /* ============================================================
     Load questions and stats on mount
  ============================================================ */
  useEffect(() => {
    fetchPracticedQuestions();
    fetchPracticeStats();
  }, []);

  /* ============================================================
     Fetch Question Bank
  ============================================================ */
  async function fetchQuestionBank() {
    if (!questionFilters.role) return;
    
    try {
      setLoading(true);
      
      const res = await api.get("/api/interview-insights/questions", {
        params: {
          role: questionFilters.role,
          industry: questionFilters.industry,
          difficulty: questionFilters.difficulty
        }
      });

      setQuestionBank(res.data.data.questionBank);
      await fetchPracticedQuestions();
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Fetch Practiced Questions
  ============================================================ */
  async function fetchPracticedQuestions() {
    try {
      const res = await api.get("/api/interview-insights/questions/practiced", {
        params: { userId }
      });
      const practiced = res.data.data.practicedQuestions || [];
      const practicedIds = new Set(practiced.map(q => q.question_id));
      setPracticedQuestions(practicedIds);
      setPracticedDetails(practiced);
    } catch (err) {
      console.error("Error fetching practiced questions:", err);
    }
  }

  /* ============================================================
     Fetch Practice Statistics
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
     Mark Question as Practiced
  ============================================================ */
  async function markAsPracticed(questionId, questionText, category, response = null) {
    try {
      await api.post("/api/interview-insights/questions/practice", {
        userId,
        questionId,
        questionText,
        questionCategory: category,
        response
      });
      
      setPracticedQuestions(prev => new Set([...prev, questionId]));
      fetchPracticeStats();
      fetchPracticedQuestions(); // Refresh practiced questions to show in review tab
    } catch (err) {
      console.error("Error marking as practiced:", err);
      alert("Failed to save practice. Please try again.");
    }
  }

  /* ============================================================
     Get filtered questions by category
  ============================================================ */
  function getFilteredQuestions() {
    if (!questionBank) return [];
    
    let questions = [];
    
    if (questionFilters.category === "all") {
      questions = [
        ...(questionBank.behavioral || []),
        ...(questionBank.technical || []),
        ...(questionBank.situational || []),
        ...(questionBank.company_specific || [])
      ];
    } else {
      questions = questionBank[questionFilters.category] || [];
    }
    
    // Filter OUT practiced questions from the practice tab
    return questions.filter(q => !practicedQuestions.has(q.id));
  }

  const filteredQuestions = getFilteredQuestions();

  /* ============================================================
     RENDER UI
  ============================================================ */
  return (
    <div className="question-bank-container">
      {/* Practice Statistics */}
      {practiceStats && (
        <div className="stats-dashboard">
          <div className="stat-card">
            <div className="stat-number">{practiceStats.totalPracticed}</div>
            <div className="stat-label">Questions Practiced</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{practiceStats.withResponses}</div>
            <div className="stat-label">Written Responses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {practiceStats.totalPracticed > 0
                ? Math.round((practiceStats.withResponses / practiceStats.totalPracticed) * 100)
                : 0}%
            </div>
            <div className="stat-label">Response Rate</div>
          </div>
        </div>
      )}

      {/* Two-Tab Interface */}
      <div className="question-tabs">
        <button 
          className={`tab-btn ${activeTab === "practice" ? "active" : ""}`}
          onClick={() => setActiveTab("practice")}
        >
          📝 Practice Questions
        </button>
        <button 
          className={`tab-btn ${activeTab === "review" ? "active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          📚 Review Responses ({practicedDetails.length})
        </button>
      </div>

      {/* Practice Tab */}
      {activeTab === "practice" && (
        <div className="practice-section">
          {/* Filters & Generate Button */}
          <div className="filters-actions">
            <div className="filters">
              <input
                type="text"
                className="filter-input"
                placeholder="e.g., Software Engineer, Data Analyst, Nurse..."
                value={questionFilters.role}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, role: e.target.value }))}
              />
              
              <select
                className="filter-select"
                value={questionFilters.industry}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, industry: e.target.value }))}
              >
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Consulting">Consulting</option>
                <option value="Education">Education</option>
                <option value="Media">Media</option>
              </select>
              
              <select
                className="filter-select"
                value={questionFilters.difficulty}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="entry">Entry Level</option>
                <option value="medium">Mid-Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
            
            <button 
              className="generate-btn"
              onClick={fetchQuestionBank}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Questions"}
            </button>
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
            </div>
          )}

          {/* Questions Grid */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>⏳ Generating questions...</p>
            </div>
          )}

          {!loading && !questionBank && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Get Started</h3>
              <p>Select your role, industry, and difficulty level, then click "Generate Questions"</p>
            </div>
          )}

          {!loading && questionBank && filteredQuestions.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <h3>All Done!</h3>
              <p>You've practiced all questions in this category! Check the Review tab to see your responses.</p>
            </div>
          )}

          {!loading && filteredQuestions.length > 0 && (
            <div className="questions-grid">
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
      )}

      {/* Review Tab */}
      {activeTab === "review" && (
        <div className="review-section">
          {practicedDetails.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No Responses Yet</h3>
              <p>Practice some questions first, and they'll appear here for review!</p>
            </div>
          ) : (
            <>
              <div className="review-header">
                <h2>Your Practice History</h2>
                <div className="review-count">{practicedDetails.length} Questions Answered</div>
              </div>
              
              <div className="practiced-questions-list">
                {practicedDetails.map((q) => (
                  <div key={q.id} className="practiced-question-card">
                    {/* Header: Date + Category */}
                    <div className="practiced-date">
                      Practiced on {new Date(q.practiced_at).toLocaleDateString()}
                      <span className="question-category-badge">{q.question_category}</span>
                    </div>
                    
                    {/* Question Section */}
                    <div className="practiced-question-text">
                      <strong>Question</strong>
                      <div>{q.question_text}</div>
                    </div>
                    
                    {/* Response Section */}
                    {q.response && (
                      <div className="practiced-response">
                        <strong>Your Response</strong>
                        <p>{q.response}</p>
                      </div>
                    )}
                    
                    {/* Footer: Practice Count */}
                    <div className="practice-count">
                      Practiced {q.practice_count} {q.practice_count === 1 ? 'time' : 'times'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Question Card Component
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
      await onMarkPracticed(question.id, question.question, question.category, response);
      setShowResponse(false);
      setResponse("");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMark = async () => {
    setSaving(true);
    try {
      await onMarkPracticed(question.id, question.question, question.category, null);
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