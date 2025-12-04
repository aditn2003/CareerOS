import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./MockInterview.css";

export default function MockInterview() {
  const userId = getUserId();
  
  const [view, setView] = useState("start"); // start, interview, summary, history
  const [companies, setCompanies] = useState([]);
  const [roleMap, setRoleMap] = useState({});
  
  // Session setup
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [interviewType, setInterviewType] = useState("mixed");
  
  // Active session
  const [sessionId, setSessionId] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [currentResponse, setCurrentResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Summary
  const [summary, setSummary] = useState(null);
  
  // History
  const [sessions, setSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionResponses, setSessionResponses] = useState({});
  const [loadingResponses, setLoadingResponses] = useState({});

  // Load companies
  useEffect(() => {
    loadCompanies();
    loadSessions();
  }, []);

  async function loadCompanies() {
    try {
      // Load companies and roles from Interview Tracker (interview_outcomes), not all jobs
      const res = await api.get("/api/interview-analytics/outcomes", {
        params: { userId }
      });
      const interviews = res.data.data || [];

      // Extract unique companies from interviews
      const uniqueCompanies = [...new Set(interviews
        .filter(i => i.company)
        .map((i) => i.company))];
      setCompanies(uniqueCompanies);

      // Build role map from interviews (company -> roles)
      const roleMapTemp = {};
      interviews.forEach((interview) => {
        if (interview.company && interview.role) {
          if (!roleMapTemp[interview.company]) roleMapTemp[interview.company] = new Set();
          roleMapTemp[interview.company].add(interview.role);
        }
      });

      const finalMap = {};
      Object.keys(roleMapTemp).forEach((company) => {
        finalMap[company] = [...roleMapTemp[company]];
      });

      setRoleMap(finalMap);

      if (uniqueCompanies.length > 0) {
        setSelectedCompany(uniqueCompanies[0]);
        setSelectedRole(finalMap[uniqueCompanies[0]]?.[0] || "");
      }
    } catch (err) {
      console.error("Error loading interview companies and roles:", err);
    }
  }

  async function loadSessions() {
    try {
      const res = await api.get(`/api/mock-interviews/user/${userId}`);
      setSessions(res.data.data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  }

  async function loadSessionResponses(sessionId) {
    if (sessionResponses[sessionId]) {
      // Already loaded, just toggle
      setExpandedSession(expandedSession === sessionId ? null : sessionId);
      return;
    }

    setLoadingResponses(prev => ({ ...prev, [sessionId]: true }));
    try {
      const res = await api.get(`/api/mock-interviews/${sessionId}/responses`);
      setSessionResponses(prev => ({
        ...prev,
        [sessionId]: res.data.data.responses || []
      }));
      setExpandedSession(sessionId);
    } catch (err) {
      console.error("Error loading responses:", err);
      alert("Failed to load responses");
    } finally {
      setLoadingResponses(prev => ({ ...prev, [sessionId]: false }));
    }
  }

  async function startInterview() {
    if (!selectedCompany || !selectedRole) {
      alert("Please select company and role");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/mock-interviews/start", {
        userId,
        company: selectedCompany,
        role: selectedRole,
        interviewType
      });

      setSessionId(res.data.data.sessionId);
      setScenario(res.data.data.scenario);
      setView("interview");
      setCurrentQuestionIndex(0);
      setResponses({});
      setCurrentResponse("");
    } catch (err) {
      console.error("Error starting interview:", err);
      alert("Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse(needFollowUp = false) {
    if (!currentResponse.trim()) {
      alert("Please write a response");
      return;
    }

    setLoading(true);
    try {
      const currentQ = scenario.questions[currentQuestionIndex];
      
      await api.post("/api/mock-interviews/respond", {
        sessionId,
        questionNumber: currentQ.question_number,
        responseText: currentResponse,
        needsFollowUp: needFollowUp
      });

      setResponses({
        ...responses,
        [currentQuestionIndex]: currentResponse
      });
      setCurrentResponse("");

      // Move to next or complete
      if (currentQuestionIndex < scenario.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        await completeInterview();
      }
    } catch (err) {
      console.error("Error submitting response:", err);
      alert("Failed to submit response");
    } finally {
      setLoading(false);
    }
  }

  async function completeInterview() {
    setLoading(true);
    try {
      const res = await api.post(`/api/mock-interviews/${sessionId}/complete`);
      setSummary(res.data.data.summary);
      setView("summary");
      loadSessions(); // Refresh history
    } catch (err) {
      console.error("Error completing interview:", err);
      alert("Failed to complete interview");
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = scenario?.questions[currentQuestionIndex];
  const progress = scenario ? ((currentQuestionIndex + 1) / scenario.questions.length) * 100 : 0;
  const wordCount = currentResponse.trim().split(/\s+/).filter(w => w).length;
  const estimatedTime = Math.round((wordCount / 150) * 60);

  return (
    <div className="mock-interview-container">
      <h1 className="page-title">🎭 Mock Interview Practice</h1>
      
      {/* START VIEW */}
      {view === "start" && (
        <div className="start-view">
          <div className="setup-card">
            <h2>Setup Your Mock Interview</h2>
            
            <div className="setup-section">
              <label>Select Company</label>
              <div className="company-grid">
                {companies.map(c => (
                  <button
                    key={c}
                    className={`company-option ${selectedCompany === c ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedCompany(c);
                      setSelectedRole(roleMap[c]?.[0] || "");
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="setup-section">
              <label>Role</label>
              <input
                type="text"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                placeholder="e.g., Software Engineer"
              />
            </div>

            <div className="setup-section">
              <label>Interview Type</label>
              <div className="type-grid">
                {["behavioral", "technical", "case_study", "mixed"].map(type => (
                  <button
                    key={type}
                    className={`type-option ${interviewType === type ? "selected" : ""}`}
                    onClick={() => setInterviewType(type)}
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-start"
              onClick={startInterview}
              disabled={loading}
            >
              {loading ? "Starting..." : "🚀 Start Mock Interview"}
            </button>
          </div>

          <button className="btn-history" onClick={() => setView("history")}>
            📊 View Past Sessions
          </button>
        </div>
      )}

      {/* INTERVIEW VIEW */}
      {view === "interview" && scenario && currentQuestion && (
        <div className="interview-view">
          {/* Header */}
          <div className="interview-header">
            <div className="header-info">
              <h2>{selectedCompany} - {selectedRole}</h2>
              <p className="scenario-desc">{scenario.scenario_description}</p>
            </div>
            <div className="progress-section">
              <div className="progress-text">
                Question {currentQuestionIndex + 1} of {scenario.questions.length}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${progress}%`}}></div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="question-card">
            <div className="question-header">
              <span className="question-type">{currentQuestion.question_type}</span>
              <span className="question-number">#{currentQuestion.question_number}</span>
            </div>
            <h3 className="question-text">{currentQuestion.question_text}</h3>
            
            {currentQuestion.response_guidance && (
              <div className="response-guidance">
                <strong>💡 Guidance:</strong>
                <ul>
                  {currentQuestion.response_guidance.key_points_to_cover?.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
                <p className="optimal-length">
                  Optimal length: {currentQuestion.response_guidance.optimal_length}
                </p>
              </div>
            )}
          </div>

          {/* Response Area */}
          <div className="response-area">
            <label>Your Response</label>
            <textarea
              value={currentResponse}
              onChange={(e) => setCurrentResponse(e.target.value)}
              placeholder="Write your response here..."
              rows={10}
            />
            <div className="response-stats">
              <span>{wordCount} words</span>
              <span>~{estimatedTime}s speaking time</span>
            </div>
          </div>

          {/* Actions */}
          <div className="interview-actions">
            <button
              className="btn-submit"
              onClick={() => submitResponse(false)}
              disabled={loading || !currentResponse.trim()}
            >
              {loading ? "Saving..." : 
               currentQuestionIndex < scenario.questions.length - 1 ? "Next Question →" : "Finish Interview"}
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY VIEW */}
      {view === "summary" && summary && (
        <div className="summary-view">
          <h2>🎉 Interview Complete!</h2>
          
          <div className="scores-overview">
            <div className="score-big">
              <div className="score-value">{summary.scores.overall_performance_score}</div>
              <div className="score-label">Overall Performance</div>
            </div>
            <div className="scores-detail">
              <div className="score-item">
                <span>Content Quality</span>
                <strong>{summary.scores.content_quality_score}</strong>
              </div>
              <div className="score-item">
                <span>Communication</span>
                <strong>{summary.scores.communication_clarity_score}</strong>
              </div>
              <div className="score-item">
                <span>Confidence</span>
                <strong>{summary.scores.confidence_level_score}</strong>
              </div>
            </div>
          </div>

          <div className="summary-section strengths">
            <h3>💪 Strengths</h3>
            <ul>
              {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="summary-section improvements">
            <h3>🎯 Areas to Improve</h3>
            <ul>
              {summary.improvement_areas.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div className="summary-section next-steps">
            <h3>📋 Next Steps</h3>
            <ol>
              {summary.next_steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>

          <div className="summary-section confidence">
            <h3>🧘 Confidence Building Exercises</h3>
            {summary.confidence_exercises.map((ex, i) => (
              <div key={i} className="exercise-card">
                <h4>{ex.exercise}</h4>
                <p>{ex.description}</p>
                <p className="exercise-benefit"><em>{ex.benefit}</em></p>
              </div>
            ))}
          </div>

          <button className="btn-restart" onClick={() => setView("start")}>
            Start New Mock Interview
          </button>
        </div>
      )}

      {/* HISTORY VIEW */}
      {view === "history" && (
        <div className="history-view">
          <div className="history-header">
            <h2>📊 Past Sessions</h2>
            <button onClick={() => setView("start")}>← Back</button>
          </div>
          
          {sessions.length === 0 ? (
            <p className="no-sessions">No sessions yet. Start your first mock interview!</p>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <div>
                      <h3>{session.company} - {session.role}</h3>
                      <p className="session-type">{session.interview_type}</p>
                    </div>
                    <div className="session-score">
                      {session.overall_performance_score || "—"}
                    </div>
                  </div>
                  <div className="session-meta">
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                    <span>{session.status}</span>
                    <span>{session.questions_completed}/{session.total_questions} questions</span>
                  </div>
                  
                  {/* View Responses Button */}
                  <button
                    className="btn-view-responses"
                    onClick={() => loadSessionResponses(session.id)}
                    disabled={loadingResponses[session.id]}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {loadingResponses[session.id] 
                      ? 'Loading...' 
                      : expandedSession === session.id 
                        ? '▼ Hide Responses' 
                        : '▶ View Responses'}
                  </button>

                  {/* Expanded Responses View */}
                  {expandedSession === session.id && sessionResponses[session.id] && (
                    <div className="session-responses" style={{
                      marginTop: '16px',
                      padding: '16px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h4 style={{ marginBottom: '16px', color: '#374151' }}>Your Responses:</h4>
                      {sessionResponses[session.id].map((response, idx) => (
                        <div key={response.id || idx} style={{
                          marginBottom: '20px',
                          padding: '16px',
                          background: 'white',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '12px'
                          }}>
                            <div>
                              <strong style={{ color: '#1f2937', fontSize: '16px' }}>
                                Question {Math.floor(response.question_number)}: {response.question_text}
                              </strong>
                              {response.question_type && (
                                <span style={{
                                  marginLeft: '8px',
                                  padding: '2px 8px',
                                  background: '#ede9fe',
                                  color: '#7c3aed',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {response.question_type}
                                </span>
                              )}
                            </div>
                            {response.response_score && (
                              <div style={{
                                padding: '4px 12px',
                                background: response.response_score >= 70 ? '#d1fae5' : response.response_score >= 50 ? '#fef3c7' : '#fee2e2',
                                color: response.response_score >= 70 ? '#065f46' : response.response_score >= 50 ? '#92400e' : '#991b1b',
                                borderRadius: '4px',
                                fontWeight: '600',
                                fontSize: '14px'
                              }}>
                                Score: {response.response_score}/100
                              </div>
                            )}
                          </div>
                          
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#f9fafb',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <p style={{
                              margin: 0,
                              color: '#374151',
                              lineHeight: '1.6',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {response.response_text || 'No response provided'}
                            </p>
                          </div>
                          
                          {response.word_count && (
                            <div style={{
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              {response.word_count} words • ~{Math.round((response.word_count / 150) * 60)}s speaking time
                            </div>
                          )}
                        </div>
                      ))}
                      {sessionResponses[session.id].length === 0 && (
                        <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No responses found for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}