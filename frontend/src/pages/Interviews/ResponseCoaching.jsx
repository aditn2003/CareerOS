import React, { useState, useEffect } from "react";
import { api } from "../../api";
import "./ResponseCoaching.css";

export default function ResponseCoaching() {
  const userId = 1; // TODO: Get from auth
  
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Custom question state
  const [showCustomQuestion, setShowCustomQuestion] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState("");
  const [customQuestionCategory, setCustomQuestionCategory] = useState("behavioral");

  // Load stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await api.get("/api/response-coaching/stats", {
        params: { userId }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  async function fetchHistory(questionId) {
    try {
      const res = await api.get(`/api/response-coaching/history/${questionId}`, {
        params: { userId }
      });
      setHistory(res.data.data.attempts || []);
      setShowHistory(true);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }

  async function submitForCoaching() {
    if (!selectedQuestion || !responseText.trim()) {
      alert("Please select a question and write a response");
      return;
    }

    setAnalyzing(true);
    setFeedback(null);

    try {
      const res = await api.post("/api/response-coaching/analyze", {
        userId,
        questionId: selectedQuestion.id,
        questionText: selectedQuestion.question,
        questionCategory: selectedQuestion.category,
        responseText
      });

      setFeedback(res.data.data);
      fetchStats(); // Refresh stats
      
      // Show improvement message if applicable
      if (res.data.data.improvement !== null) {
        const improvement = res.data.data.improvement;
        if (improvement > 0) {
          alert(`Great! You improved by ${improvement} points!`);
        }
      }
    } catch (err) {
      console.error("Error analyzing response:", err);
      alert("Failed to analyze response. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleCreateCustomQuestion() {
    if (!customQuestionText.trim()) {
      alert("Please enter a question");
      return;
    }

    const customQuestion = {
      id: `custom-${Date.now()}`,
      question: customQuestionText,
      category: customQuestionCategory
    };

    setSelectedQuestion(customQuestion);
    setShowCustomQuestion(false);
    setFeedback(null);
    setResponseText("");
  }

  // Sample questions for practice
  const sampleQuestions = [
    {
      id: "sample-beh-1",
      question: "Tell me about a time you faced a significant challenge at work.",
      category: "behavioral"
    },
    {
      id: "sample-beh-2",
      question: "Describe a situation where you had to work with a difficult team member.",
      category: "behavioral"
    },
    {
      id: "sample-tech-1",
      question: "Explain your approach to debugging a complex issue in production.",
      category: "technical"
    },
    {
      id: "sample-sit-1",
      question: "How would you handle a situation where you disagree with your manager?",
      category: "situational"
    }
  ];

  const wordCount = responseText.trim().split(/\s+/).filter(w => w).length;
  const estimatedTime = Math.round((wordCount / 150) * 60);

  return (
    <div className="response-coaching-container">
      <h1 className="page-title">🤖 AI Response Coaching</h1>
      <p className="page-subtitle">
        Get instant feedback on your interview responses with AI-powered coaching
      </p>

      {/* Stats Overview */}
      {stats && (
        <div className="coaching-stats">
          <div className="stat-box">
            <div className="stat-value">{stats.totalResponses}</div>
            <div className="stat-label">Responses Coached</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.averageScore}</div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.improvementCount}</div>
            <div className="stat-label">Improved Responses</div>
          </div>
        </div>
      )}

      <div className="coaching-main">
        {/* Left: Question Selection & Response Input */}
        <div className="coaching-left">
          <div className="section-card">
            <h2>1. Select a Question</h2>
            <div className="question-list">
              {sampleQuestions.map((q) => (
                <button
                  key={q.id}
                  className={`question-option ${selectedQuestion?.id === q.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedQuestion(q);
                    setFeedback(null);
                    setShowHistory(false);
                  }}
                >
                  <span className="category-pill">{q.category}</span>
                  <span className="question-text">{q.question}</span>
                </button>
              ))}
              
              {/* Custom Question Button */}
              <button
                className={`question-option custom-question-btn ${showCustomQuestion ? "selected" : ""}`}
                onClick={() => {
                  setShowCustomQuestion(!showCustomQuestion);
                  setSelectedQuestion(null);
                  setFeedback(null);
                  setShowHistory(false);
                }}
              >
                <span className="category-pill custom">custom</span>
                <span className="question-text">✨ Add Your Own Question</span>
              </button>
            </div>

            {/* Custom Question Form */}
            {showCustomQuestion && (
              <div className="custom-question-form">
                <h3>Create Your Custom Question</h3>
                <div className="form-group">
                  <label>Question Category</label>
                  <select
                    value={customQuestionCategory}
                    onChange={(e) => setCustomQuestionCategory(e.target.value)}
                    className="category-select"
                  >
                    <option value="behavioral">Behavioral</option>
                    <option value="technical">Technical</option>
                    <option value="situational">Situational</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Your Question</label>
                  <textarea
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    placeholder="Enter your interview question here..."
                    rows={3}
                    className="custom-question-input"
                  />
                </div>
                <button 
                  className="create-question-btn"
                  onClick={handleCreateCustomQuestion}
                  disabled={!customQuestionText.trim()}
                >
                  ✓ Use This Question
                </button>
              </div>
            )}
          </div>

          {selectedQuestion && (
            <>
              <div className="section-card">
                <h2>2. Write Your Response</h2>
                <p className="guidance-text">
                  {selectedQuestion.category === "behavioral" 
                    ? "💡 Use the STAR method: Situation, Task, Action, Result"
                    : "💡 Be specific, concise, and include examples"
                  }
                </p>
                <textarea
                  className="response-textarea"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type your response here..."
                  rows={12}
                />
                <div className="response-meta">
                  <span>{wordCount} words</span>
                  <span>~{estimatedTime}s speaking time</span>
                  <span className={`timing-indicator ${
                    estimatedTime < 60 ? "too-short" : 
                    estimatedTime > 150 ? "too-long" : "optimal"
                  }`}>
                    {estimatedTime < 60 ? "⚠️ Too short" : 
                     estimatedTime > 150 ? "⚠️ Too long" : "✓ Optimal length"}
                  </span>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-primary btn-large"
                  onClick={submitForCoaching}
                  disabled={analyzing || !responseText.trim()}
                >
                  {analyzing ? "Analyzing..." : "🚀 Get AI Coaching"}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => fetchHistory(selectedQuestion.id)}
                >
                  📊 View History
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Feedback Display */}
        <div className="coaching-right">
          {analyzing && (
            <div className="loading-feedback">
              <div className="spinner"></div>
              <p>Analyzing your response...</p>
            </div>
          )}

          {feedback && (
            <div className="feedback-panel">
              <FeedbackDisplay feedback={feedback} />
            </div>
          )}

          {showHistory && history.length > 0 && (
            <div className="history-panel">
              <h2>📈 Improvement History</h2>
              <div className="history-list">
                {history.map((attempt) => (
                  <HistoryCard key={attempt.id} attempt={attempt} />
                ))}
              </div>
            </div>
          )}

          {!feedback && !showHistory && !analyzing && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h3>Ready to Improve?</h3>
              <p>Select a question above (or create your own!) and write your response to get instant AI coaching</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Feedback Display Component
============================================================ */
function FeedbackDisplay({ feedback }) {
  const { analysis, attemptNumber, improvement, previousScore } = feedback;

  return (
    <div className="feedback-content">
      {/* Overall Score */}
      <div className="overall-score-section">
        <div className="score-circle">
          <div className="score-value">{analysis.scores.overall_score}</div>
          <div className="score-label">Overall Score</div>
        </div>
        {improvement !== null && (
          <div className={`improvement-badge ${improvement > 0 ? "positive" : "negative"}`}>
            {improvement > 0 ? "📈" : "📉"} {improvement > 0 ? "+" : ""}{improvement} pts
            <div className="improvement-detail">
              Attempt #{attemptNumber} | Previous: {previousScore}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Scores */}
      <div className="scores-grid">
        <ScoreBar label="Relevance" score={analysis.scores.relevance_score} />
        <ScoreBar label="Specificity" score={analysis.scores.specificity_score} />
        <ScoreBar label="Impact" score={analysis.scores.impact_score} />
      </div>

      {/* STAR Analysis (if behavioral) */}
      {analysis.star_analysis && (
        <div className="star-analysis-section">
          <h3>⭐ STAR Method Analysis</h3>
          <div className="star-grid">
            <STARElement 
              label="Situation" 
              present={analysis.star_analysis.situation_present} 
            />
            <STARElement 
              label="Task" 
              present={analysis.star_analysis.task_present} 
            />
            <STARElement 
              label="Action" 
              present={analysis.star_analysis.action_present} 
            />
            <STARElement 
              label="Result" 
              present={analysis.star_analysis.result_present} 
            />
          </div>
          <div className="star-score">
            STAR Adherence: <strong>{analysis.star_analysis.star_adherence_score}/100</strong>
          </div>
          {analysis.star_analysis.missing_elements?.length > 0 && (
            <div className="star-missing">
              Missing: {analysis.star_analysis.missing_elements.join(", ")}
            </div>
          )}
          <p className="star-feedback">{analysis.star_analysis.star_feedback}</p>
        </div>
      )}

      {/* Timing Analysis */}
      <div className="timing-section">
        <h3>⏱️ Timing Analysis</h3>
        <div className="timing-stats">
          <div className="timing-stat">
            <strong>{analysis.timing_analysis.word_count}</strong> words
          </div>
          <div className="timing-stat">
            <strong>~{analysis.timing_analysis.estimated_speaking_time_seconds}s</strong> speaking time
          </div>
          <div className={`timing-rec ${analysis.timing_analysis.timing_recommendation}`}>
            {analysis.timing_analysis.timing_recommendation === "optimal" && "✓ Optimal"}
            {analysis.timing_analysis.timing_recommendation === "too_short" && "⚠️ Too Short"}
            {analysis.timing_analysis.timing_recommendation === "too_long" && "⚠️ Too Long"}
          </div>
        </div>
        <p className="timing-feedback">{analysis.timing_analysis.timing_feedback}</p>
      </div>

      {/* Content Feedback */}
      <div className="content-feedback-section">
        <div className="feedback-subsection strengths">
          <h3>💪 Strengths</h3>
          <ul>
            {analysis.content_feedback.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="feedback-subsection weaknesses">
          <h3>🎯 Areas to Improve</h3>
          <ul>
            {analysis.content_feedback.weaknesses.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Language Patterns */}
      {analysis.language_patterns.suggestions.length > 0 && (
        <div className="language-section">
          <h3>📝 Language Improvements</h3>
          <div className="language-suggestions">
            {analysis.language_patterns.suggestions.map((s, i) => (
              <div key={i} className="suggestion-item">
                <span className="suggestion-icon">💡</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Approaches */}
      {analysis.alternative_approaches?.length > 0 && (
        <div className="alternatives-section">
          <h3>🔄 Alternative Approaches</h3>
          {analysis.alternative_approaches.map((alt, i) => (
            <div key={i} className="alternative-card">
              <h4>{alt.approach}</h4>
              <p className="alt-example">{alt.example}</p>
              <p className="alt-why">{alt.why_better}</p>
            </div>
          ))}
        </div>
      )}

      {/* Key Improvements */}
      <div className="improvements-section">
        <h3>🎯 Key Improvements to Focus On</h3>
        <div className="improvements-list">
          {analysis.key_improvements.map((imp, i) => (
            <div key={i} className="improvement-item">
              <span className="improvement-number">{i + 1}</span>
              <span>{imp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Feedback */}
      <div className="overall-feedback-section">
        <h3>📋 Overall Feedback</h3>
        <p>{analysis.overall_feedback}</p>
      </div>
    </div>
  );
}

/* Helper Components */
function ScoreBar({ label, score }) {
  return (
    <div className="score-bar-container">
      <div className="score-bar-label">
        <span>{label}</span>
        <span className="score-bar-value">{score}/100</span>
      </div>
      <div className="score-bar-track">
        <div 
          className="score-bar-fill" 
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}

function STARElement({ label, present }) {
  return (
    <div className={`star-element ${present ? "present" : "missing"}`}>
      <div className="star-check">{present ? "✓" : "✗"}</div>
      <div className="star-label">{label}</div>
    </div>
  );
}

function HistoryCard({ attempt }) {
  const improvementClass = attempt.improvement_from_previous > 0 ? "positive" : 
                          attempt.improvement_from_previous < 0 ? "negative" : "neutral";

  return (
    <div className="history-card">
      <div className="history-header">
        <span className="history-attempt">Attempt #{attempt.attempt_number}</span>
        <span className="history-date">
          {new Date(attempt.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="history-score">
        Score: <strong>{attempt.overall_score}/100</strong>
        {attempt.improvement_from_previous !== null && (
          <span className={`history-improvement ${improvementClass}`}>
            {attempt.improvement_from_previous > 0 ? "+" : ""}
            {attempt.improvement_from_previous}
          </span>
        )}
      </div>
      <div className="history-metrics">
        <span>{attempt.word_count} words</span>
        <span>~{attempt.estimated_speaking_time}s</span>
      </div>
    </div>
  );
}