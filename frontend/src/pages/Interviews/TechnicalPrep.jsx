import React, { useState, useEffect, useRef } from "react";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./TechnicalPrep.css";

export default function TechnicalPrep() {
  const userId = getUserId();
  
  // View state
  const [activeTab, setActiveTab] = useState("coding"); // coding, system_design, whiteboard, questions, frameworks
  const [view, setView] = useState("menu"); // menu, challenge, result, history
  
  // Setup state
  const [techStack, setTechStack] = useState(["javascript"]);
  const [difficulty, setDifficulty] = useState("medium");
  const [category, setCategory] = useState("arrays");
  const [seniorityLevel, setSeniorityLevel] = useState("mid");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  
  // Challenge state
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [userCode, setUserCode] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [hintsUsed, setHintsUsed] = useState([]);
  const [showSolution, setShowSolution] = useState(false);
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef(null);
  
  // System design state
  const [systemDesignQuestion, setSystemDesignQuestion] = useState(null);
  const [userResponse, setUserResponse] = useState("");
  const [sdHasUnsavedChanges, setSdHasUnsavedChanges] = useState(false);
  const [sdSaved, setSdSaved] = useState(false);
  
  // Whiteboard state
  const [whiteboardSession, setWhiteboardSession] = useState(null);
  
  // Questions state
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  
  // Frameworks state
  const [frameworks, setFrameworks] = useState(null);
  
  // Stats state
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState({ codingChallenges: [], systemDesignQuestions: [] });
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Tech stack options
  const techStackOptions = [
    "javascript", "typescript", "python", "java", "c++", "go", "rust", "ruby", "php", "swift", "kotlin"
  ];
  
  // Category options
  const categoryOptions = [
    { value: "arrays", label: "Arrays & Strings" },
    { value: "linked_lists", label: "Linked Lists" },
    { value: "trees", label: "Trees & Graphs" },
    { value: "dynamic_programming", label: "Dynamic Programming" },
    { value: "recursion", label: "Recursion & Backtracking" },
    { value: "sorting", label: "Sorting & Searching" },
    { value: "hash_tables", label: "Hash Tables" },
    { value: "stacks_queues", label: "Stacks & Queues" },
    { value: "heaps", label: "Heaps & Priority Queues" },
    { value: "math", label: "Math & Logic" }
  ];

  // System design categories
  const systemDesignCategories = [
    { value: "distributed_systems", label: "Distributed Systems" },
    { value: "scalability", label: "Scalability" },
    { value: "database_design", label: "Database Design" },
    { value: "api_design", label: "API Design" },
    { value: "caching", label: "Caching Systems" },
    { value: "messaging", label: "Message Queues" },
    { value: "real_time", label: "Real-time Systems" }
  ];

  // Load stats and history on mount
  useEffect(() => {
    if (userId) {
      loadStats();
      loadHistory();
      loadFrameworks();
    }
  }, [userId]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await api.get(`/api/technical-prep/user/${userId}/stats`);
      setStats(res.data.data);
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await api.get(`/api/technical-prep/user/${userId}/history`);
      setHistory(res.data.data);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  }

  async function loadFrameworks() {
    try {
      const res = await api.get("/api/technical-prep/solution-frameworks");
      setFrameworks(res.data.data.frameworks);
    } catch (err) {
      console.error("Error loading frameworks:", err);
    }
  }

  async function startCodingChallenge() {
    setLoading(true);
    try {
      const res = await api.post("/api/technical-prep/coding-challenge", {
        userId,
        techStack,
        difficulty,
        category
      });
      
      // Include challengeId in the challenge object
      const challengeData = {
        ...res.data.data.challenge,
        challengeId: res.data.data.challengeId
      };
      
      setCurrentChallenge(challengeData);
      setUserCode(challengeData.starter_code || "");
      setView("challenge");
      setTimeElapsed(0);
      setIsTimerRunning(true);
      setHintsUsed([]);
      setShowSolution(false);
      setEvaluation(null);
    } catch (err) {
      console.error("Error starting challenge:", err);
      alert("Failed to generate challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitSolution() {
    setIsTimerRunning(false);
    setLoading(true);
    
    // Check if we have a challengeId
    if (!currentChallenge?.challengeId) {
      // If no challengeId, show the solution directly without API evaluation
      setEvaluation({
        score: 70,
        feedback: "Solution submitted! Review the optimal solution below to compare your approach.",
        correctness: { is_correct: true, issues: [] },
        improvements: ["Compare your solution with the optimal one", "Consider time and space complexity"],
        what_went_well: ["You completed the challenge!", "Good effort on tackling the problem"]
      });
      setView("result");
      setLoading(false);
      return;
    }
    
    try {
      const res = await api.post("/api/technical-prep/submit-solution", {
        challengeId: currentChallenge.challengeId,
        userSolution: userCode,
        timeSpent: timeElapsed
      });
      
      setEvaluation(res.data.data.evaluation);
      setCurrentChallenge({
        ...currentChallenge,
        optimal_solution: res.data.data.optimal_solution,
        solution_explanation: res.data.data.solution_explanation
      });
      setView("result");
      loadStats();
      loadHistory();
    } catch (err) {
      console.error("Error submitting solution:", err);
      // On error, still show the result with the local solution
      setEvaluation({
        score: 70,
        feedback: "Could not get AI evaluation, but here's the solution to compare your work!",
        correctness: { is_correct: true, issues: [] },
        improvements: ["Compare your solution with the optimal one"],
        what_went_well: ["You completed the challenge!"]
      });
      setView("result");
    } finally {
      setLoading(false);
    }
  }

  async function getHint(level) {
    if (hintsUsed.includes(level)) return;
    
    // First try to get hint from local challenge object (works without DB)
    const localHint = currentChallenge?.hints?.find(h => h.level === level);
    if (localHint) {
      setHintsUsed([...hintsUsed, level]);
      alert(`💡 Hint ${level}: ${localHint.hint}`);
      return;
    }
    
    // Fall back to API if we have a challengeId
    if (currentChallenge?.challengeId) {
      try {
        const res = await api.get(`/api/technical-prep/hint/${currentChallenge.challengeId}/${level}`);
        setHintsUsed([...hintsUsed, level]);
        alert(`💡 Hint ${level}: ${res.data.data.hint}`);
      } catch (err) {
        console.error("Error getting hint:", err);
        alert("Could not retrieve hint. Please try again.");
      }
    } else {
      alert("Hints are not available for this challenge.");
    }
  }

  async function startSystemDesign() {
    // Check for unsaved changes
    if (sdHasUnsavedChanges && !window.confirm("You have unsaved changes. Start a new question anyway?")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post("/api/technical-prep/system-design", {
        userId,
        role: role || "Software Engineer",
        seniorityLevel,
        category
      });
      
      // Include questionId in the question object
      const questionData = {
        ...res.data.data.question,
        questionId: res.data.data.questionId
      };
      
      setSystemDesignQuestion(questionData);
      setUserResponse("");
      setSdHasUnsavedChanges(false);
      setSdSaved(false);
      setShowSolution(false);
      setView("challenge");
    } catch (err) {
      console.error("Error starting system design:", err);
      alert("Failed to generate question. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Save system design progress
  async function saveSystemDesign() {
    if (!systemDesignQuestion?.questionId) {
      alert("Cannot save - question not properly initialized. Your notes are preserved locally.");
      return;
    }
    
    setLoading(true);
    try {
      await api.post("/api/technical-prep/save-system-design", {
        questionId: systemDesignQuestion.questionId,
        userResponse,
        userId
      });
      
      setSdHasUnsavedChanges(false);
      setSdSaved(true);
      loadHistory();
      alert("✅ Progress saved successfully!");
    } catch (err) {
      console.error("Error saving system design:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Handle back to menu with unsaved changes check
  function handleSdBackToMenu() {
    if (sdHasUnsavedChanges && !window.confirm("You have unsaved changes. Leave without saving?")) {
      return;
    }
    resetToMenu();
  }

  // Load a saved system design question
  async function loadSystemDesignQuestion(questionId) {
    setLoading(true);
    try {
      const res = await api.get(`/api/technical-prep/system-design/${questionId}`);
      const question = res.data.data.question;
      
      setSystemDesignQuestion({
        ...question,
        questionId: question.id
      });
      setUserResponse(question.user_response || "");
      setSdHasUnsavedChanges(false);
      setSdSaved(true);
      setView("challenge");
      setActiveTab("system_design");
    } catch (err) {
      console.error("Error loading question:", err);
      alert("Failed to load question.");
    } finally {
      setLoading(false);
    }
  }

  async function startWhiteboard() {
    setLoading(true);
    try {
      const res = await api.post("/api/technical-prep/whiteboard", {
        userId,
        techStack,
        topic: category
      });
      
      setWhiteboardSession(res.data.data.session);
      setView("challenge");
    } catch (err) {
      console.error("Error starting whiteboard:", err);
      alert("Failed to generate session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function generateQuestions() {
    setLoading(true);
    try {
      const res = await api.post("/api/technical-prep/generate-questions", {
        jobDescription,
        techStack,
        seniorityLevel
      });
      
      setGeneratedQuestions(res.data.data.questions);
    } catch (err) {
      console.error("Error generating questions:", err);
      alert("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function formatTotalTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} minutes`;
  }

  function resetToMenu() {
    setView("menu");
    setCurrentChallenge(null);
    setSystemDesignQuestion(null);
    setWhiteboardSession(null);
    setEvaluation(null);
    setIsTimerRunning(false);
    setTimeElapsed(0);
  }

  return (
    <div className="technical-prep-container">
      {/* Header with Stats */}
      <div className="tech-prep-header">
        <div className="header-content">
          <h1>💻 Technical Interview Prep</h1>
          <p className="subtitle">Master coding challenges, system design, and whiteboarding</p>
        </div>
        
        {stats && (
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.coding?.completed || 0}</span>
              <span className="stat-label">Challenges</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.coding?.averageScore || 0}%</span>
              <span className="stat-label">Avg Score</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{formatTotalTime(stats.totalPracticeTime || 0)}</span>
              <span className="stat-label">Practice Time</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="prep-tabs">
        <button 
          className={`prep-tab ${activeTab === 'coding' ? 'active' : ''}`}
          onClick={() => { setActiveTab('coding'); resetToMenu(); }}
        >
          <span className="tab-icon">⌨️</span>
          <span>Coding Challenges</span>
        </button>
        <button 
          className={`prep-tab ${activeTab === 'system_design' ? 'active' : ''}`}
          onClick={() => { setActiveTab('system_design'); resetToMenu(); }}
        >
          <span className="tab-icon">🏗️</span>
          <span>System Design</span>
        </button>
        <button 
          className={`prep-tab ${activeTab === 'whiteboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('whiteboard'); resetToMenu(); }}
        >
          <span className="tab-icon">📋</span>
          <span>Whiteboard</span>
        </button>
        <button 
          className={`prep-tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => { setActiveTab('questions'); resetToMenu(); }}
        >
          <span className="tab-icon">❓</span>
          <span>Question Generator</span>
        </button>
        <button 
          className={`prep-tab ${activeTab === 'frameworks' ? 'active' : ''}`}
          onClick={() => { setActiveTab('frameworks'); resetToMenu(); }}
        >
          <span className="tab-icon">📚</span>
          <span>Frameworks</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="prep-content">
        
        {/* ===== CODING CHALLENGES TAB ===== */}
        {activeTab === 'coding' && (
          <>
            {view === 'menu' && (
              <div className="coding-menu">
                <div className="setup-panel">
                  <h2>🚀 Start a Coding Challenge</h2>
                  
                  <div className="setup-grid">
                    <div className="setup-field">
                      <label>Tech Stack</label>
                      <select 
                        value={techStack[0]} 
                        onChange={(e) => setTechStack([e.target.value])}
                      >
                        {techStackOptions.map(tech => (
                          <option key={tech} value={tech}>
                            {tech.charAt(0).toUpperCase() + tech.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="setup-field">
                      <label>Difficulty</label>
                      <div className="difficulty-selector">
                        {['easy', 'medium', 'hard'].map(diff => (
                          <button
                            key={diff}
                            className={`diff-btn ${difficulty === diff ? 'active' : ''} ${diff}`}
                            onClick={() => setDifficulty(diff)}
                          >
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="setup-field full-width">
                      <label>Category</label>
                      <div className="category-grid">
                        {categoryOptions.map(cat => (
                          <button
                            key={cat.value}
                            className={`category-btn ${category === cat.value ? 'active' : ''}`}
                            onClick={() => setCategory(cat.value)}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="btn-start-challenge"
                    onClick={startCodingChallenge}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "🎯 Start Timed Challenge"}
                  </button>
                </div>

                {/* Recent History */}
                {history.codingChallenges.length > 0 && (
                  <div className="history-panel">
                    <h3>📜 Recent Challenges</h3>
                    <div className="history-list">
                      {history.codingChallenges.slice(0, 5).map(challenge => (
                        <div key={challenge.id} className="history-item">
                          <div className="history-info">
                            <span className="history-title">{challenge.title}</span>
                            <span className={`history-difficulty ${challenge.difficulty}`}>
                              {challenge.difficulty}
                            </span>
                          </div>
                          <div className="history-meta">
                            <span className={`history-score ${challenge.is_completed ? 'completed' : 'incomplete'}`}>
                              {challenge.score || '—'}%
                            </span>
                            <span className="history-date">
                              {new Date(challenge.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Breakdown */}
                {stats && stats.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
                  <div className="stats-panel">
                    <h3>📊 Category Performance</h3>
                    <div className="category-stats">
                      {Object.entries(stats.categoryBreakdown).map(([cat, data]) => (
                        <div key={cat} className="category-stat-item">
                          <span className="cat-name">{cat.replace('_', ' ')}</span>
                          <div className="cat-bar">
                            <div 
                              className="cat-progress"
                              style={{ width: `${data.avgScore}%` }}
                            />
                          </div>
                          <span className="cat-score">{data.avgScore}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'challenge' && currentChallenge && (
              <div className="challenge-view">
                <div className="challenge-header">
                  <div className="challenge-info">
                    <h2>{currentChallenge.title}</h2>
                    <div className="challenge-tags">
                      <span className={`tag difficulty ${currentChallenge.difficulty}`}>
                        {currentChallenge.difficulty}
                      </span>
                      <span className="tag category">{currentChallenge.category}</span>
                      <span className="tag tech">{currentChallenge.tech_stack}</span>
                    </div>
                  </div>
                  <div className="timer-section">
                    <div className={`timer ${timeElapsed > 1800 ? 'warning' : ''}`}>
                      ⏱️ {formatTime(timeElapsed)}
                    </div>
                    <button 
                      className="btn-pause"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                    >
                      {isTimerRunning ? '⏸️ Pause' : '▶️ Resume'}
                    </button>
                  </div>
                </div>

                <div className="challenge-body">
                  <div className="problem-section">
                    <h3>Problem Description</h3>
                    <div className="problem-text">
                      {currentChallenge.description.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                    
                    {currentChallenge.test_cases && (
                      <div className="test-cases">
                        <h4>Test Cases</h4>
                        {currentChallenge.test_cases.map((tc, i) => (
                          <div key={i} className="test-case">
                            <div className="test-input">
                              <strong>Input:</strong> {tc.input}
                            </div>
                            <div className="test-output">
                              <strong>Expected:</strong> {tc.expected_output}
                            </div>
                            {tc.explanation && (
                              <div className="test-explain">
                                <em>{tc.explanation}</em>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="hints-section">
                      <h4>💡 Hints</h4>
                      <div className="hint-buttons">
                        {[1, 2, 3].map(level => (
                          <button
                            key={level}
                            className={`hint-btn ${hintsUsed.includes(level) ? 'used' : ''}`}
                            onClick={() => getHint(level)}
                            disabled={hintsUsed.includes(level)}
                          >
                            {hintsUsed.includes(level) ? `✓ Hint ${level}` : `Hint ${level}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {currentChallenge.real_world_applications && (
                      <div className="real-world">
                        <h4>🌍 Real-World Applications</h4>
                        <ul>
                          {currentChallenge.real_world_applications.map((app, i) => (
                            <li key={i}>{app}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="code-section">
                    <h3>Your Solution</h3>
                    <textarea
                      className="code-editor"
                      value={userCode}
                      onChange={(e) => setUserCode(e.target.value)}
                      placeholder="Write your solution here..."
                      spellCheck={false}
                    />
                    
                    <div className="code-actions">
                      <button 
                        className="btn-submit"
                        onClick={submitSolution}
                        disabled={loading || !userCode.trim()}
                      >
                        {loading ? "Evaluating..." : "📤 Submit Solution"}
                      </button>
                      <button 
                        className="btn-skip"
                        onClick={() => setShowSolution(true)}
                      >
                        🔍 Show Solution
                      </button>
                      <button 
                        className="btn-quit"
                        onClick={resetToMenu}
                      >
                        ✖ Quit
                      </button>
                    </div>

                    {showSolution && currentChallenge.optimal_solution && (
                      <div className="solution-reveal">
                        <h4>Optimal Solution</h4>
                        <pre className="solution-code">{currentChallenge.optimal_solution}</pre>
                        {currentChallenge.solution_explanation && (
                          <div className="solution-explanation">
                            <h5>Explanation</h5>
                            <p>{currentChallenge.solution_explanation}</p>
                          </div>
                        )}
                        <div className="complexity-info">
                          <span>Time: {currentChallenge.time_complexity}</span>
                          <span>Space: {currentChallenge.space_complexity}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'result' && evaluation && (
              <div className="result-view">
                <div className="result-header">
                  <h2>🎉 Challenge Complete!</h2>
                  <div className="result-score">
                    <div className={`score-circle ${evaluation.score >= 80 ? 'excellent' : evaluation.score >= 60 ? 'good' : 'needs-work'}`}>
                      <span className="score-value">{evaluation.score}</span>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                </div>

                <div className="result-body">
                  <div className="result-stats">
                    <div className="stat">
                      <span className="stat-icon">⏱️</span>
                      <span className="stat-text">Time: {formatTime(timeElapsed)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-icon">💡</span>
                      <span className="stat-text">Hints Used: {hintsUsed.length}/3</span>
                    </div>
                  </div>

                  {evaluation.correctness && (
                    <div className={`correctness-box ${evaluation.correctness.is_correct ? 'correct' : 'incorrect'}`}>
                      <h4>{evaluation.correctness.is_correct ? '✅ Correct Solution' : '⚠️ Issues Found'}</h4>
                      {evaluation.correctness.issues?.length > 0 && (
                        <ul>
                          {evaluation.correctness.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {evaluation.complexity_analysis && (
                    <div className="complexity-box">
                      <h4>📊 Complexity Analysis</h4>
                      <div className="complexity-grid">
                        <div className="complexity-item">
                          <span className="label">Time</span>
                          <span className="value">{evaluation.complexity_analysis.time}</span>
                        </div>
                        <div className="complexity-item">
                          <span className="label">Space</span>
                          <span className="value">{evaluation.complexity_analysis.space}</span>
                        </div>
                        <div className="complexity-item">
                          <span className="label">Optimal?</span>
                          <span className={`value ${evaluation.complexity_analysis.is_optimal ? 'yes' : 'no'}`}>
                            {evaluation.complexity_analysis.is_optimal ? 'Yes ✓' : 'No'}
                          </span>
                        </div>
                      </div>
                      {evaluation.complexity_analysis.explanation && (
                        <p className="complexity-explain">{evaluation.complexity_analysis.explanation}</p>
                      )}
                    </div>
                  )}

                  {evaluation.code_quality && (
                    <div className="quality-box">
                      <h4>📝 Code Quality</h4>
                      <div className="quality-scores">
                        <div className="quality-item">
                          <span>Readability</span>
                          <div className="quality-bar">
                            <div style={{ width: `${evaluation.code_quality.readability * 10}%` }} />
                          </div>
                          <span>{evaluation.code_quality.readability}/10</span>
                        </div>
                        <div className="quality-item">
                          <span>Naming</span>
                          <div className="quality-bar">
                            <div style={{ width: `${evaluation.code_quality.naming * 10}%` }} />
                          </div>
                          <span>{evaluation.code_quality.naming}/10</span>
                        </div>
                        <div className="quality-item">
                          <span>Structure</span>
                          <div className="quality-bar">
                            <div style={{ width: `${evaluation.code_quality.structure * 10}%` }} />
                          </div>
                          <span>{evaluation.code_quality.structure}/10</span>
                        </div>
                      </div>
                      {evaluation.code_quality.comments && (
                        <p className="quality-comments">{evaluation.code_quality.comments}</p>
                      )}
                    </div>
                  )}

                  <div className="feedback-box">
                    <h4>💬 Feedback</h4>
                    <p>{evaluation.feedback}</p>
                  </div>

                  {evaluation.what_went_well?.length > 0 && (
                    <div className="strengths-box">
                      <h4>💪 What Went Well</h4>
                      <ul>
                        {evaluation.what_went_well.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.improvements?.length > 0 && (
                    <div className="improvements-box">
                      <h4>🎯 Areas for Improvement</h4>
                      <ul>
                        {evaluation.improvements.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentChallenge.optimal_solution && (
                    <div className="optimal-solution-box">
                      <h4>✨ Optimal Solution</h4>
                      <pre className="solution-code">{currentChallenge.optimal_solution}</pre>
                      <p className="solution-explain">{currentChallenge.solution_explanation}</p>
                      <div className="complexity-tags">
                        <span>Time: {currentChallenge.time_complexity}</span>
                        <span>Space: {currentChallenge.space_complexity}</span>
                      </div>
                    </div>
                  )}

                  {evaluation.interview_readiness && (
                    <div className="readiness-box">
                      <h4>🎤 Interview Readiness</h4>
                      <p>{evaluation.interview_readiness}</p>
                    </div>
                  )}
                </div>

                <div className="result-actions">
                  <button className="btn-primary" onClick={startCodingChallenge}>
                    🔄 Try Another Challenge
                  </button>
                  <button className="btn-secondary" onClick={resetToMenu}>
                    ← Back to Menu
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== SYSTEM DESIGN TAB ===== */}
        {activeTab === 'system_design' && (
          <>
            {view === 'menu' && (
              <div className="system-design-menu">
                <div className="setup-panel">
                  <h2>🏗️ System Design Practice</h2>
                  <p className="description">
                    Practice designing scalable systems for senior-level interviews
                  </p>
                  
                  <div className="setup-grid">
                    <div className="setup-field">
                      <label>Your Role</label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Senior Software Engineer"
                      />
                    </div>
                    
                    <div className="setup-field">
                      <label>Seniority Level</label>
                      <div className="seniority-selector">
                        {['mid', 'senior', 'staff'].map(level => (
                          <button
                            key={level}
                            className={`seniority-btn ${seniorityLevel === level ? 'active' : ''}`}
                            onClick={() => setSeniorityLevel(level)}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="setup-field full-width">
                      <label>Focus Area</label>
                      <div className="category-grid">
                        {systemDesignCategories.map(cat => (
                          <button
                            key={cat.value}
                            className={`category-btn ${category === cat.value ? 'active' : ''}`}
                            onClick={() => setCategory(cat.value)}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="btn-start-challenge"
                    onClick={startSystemDesign}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "🎯 Start System Design Question"}
                  </button>
                </div>

                {/* Recent System Design Questions */}
                {history.systemDesignQuestions?.length > 0 && (
                  <div className="history-panel">
                    <h3>📜 Recent System Design Questions</h3>
                    <div className="history-list">
                      {history.systemDesignQuestions.slice(0, 5).map(question => (
                        <div 
                          key={question.id} 
                          className="history-item clickable"
                          onClick={() => loadSystemDesignQuestion(question.id)}
                        >
                          <div className="history-info">
                            <span className="history-title">{question.title}</span>
                            <span className={`history-difficulty ${question.difficulty}`}>
                              {question.difficulty}
                            </span>
                          </div>
                          <div className="history-meta">
                            <span className={`history-status ${question.user_response ? 'has-notes' : 'no-notes'}`}>
                              {question.user_response ? '📝 Has notes' : 'No notes'}
                            </span>
                            <span className="history-date">
                              {new Date(question.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="info-panel">
                  <h3>📖 What to Expect</h3>
                  <ul>
                    <li>Requirements gathering and clarifying questions</li>
                    <li>High-level architecture design</li>
                    <li>Deep dive into specific components</li>
                    <li>Trade-off discussions</li>
                    <li>Scalability and reliability considerations</li>
                  </ul>
                </div>
              </div>
            )}

            {view === 'challenge' && systemDesignQuestion && (
              <div className="system-design-view">
                <div className="sd-header">
                  <h2>{systemDesignQuestion.title}</h2>
                  <span className={`difficulty-badge ${systemDesignQuestion.difficulty}`}>
                    {systemDesignQuestion.difficulty}
                  </span>
                </div>

                <div className="sd-content">
                  <div className="sd-left">
                    <div className="sd-section">
                      <h3>📋 Problem</h3>
                      <p>{systemDesignQuestion.description}</p>
                    </div>

                    {systemDesignQuestion.requirements && (
                      <div className="sd-section">
                        <h3>✅ Requirements</h3>
                        <div className="requirements-grid">
                          <div className="req-category">
                            <h4>Functional</h4>
                            <ul>
                              {systemDesignQuestion.requirements.functional?.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="req-category">
                            <h4>Non-Functional</h4>
                            <ul>
                              {systemDesignQuestion.requirements.non_functional?.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {systemDesignQuestion.constraints && (
                      <div className="sd-section">
                        <h3>⚠️ Constraints</h3>
                        <div className="constraints-grid">
                          {Object.entries(systemDesignQuestion.constraints).map(([key, value]) => (
                            <div key={key} className="constraint-item">
                              <span className="constraint-label">{key}</span>
                              <span className="constraint-value">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {systemDesignQuestion.evaluation_criteria && (
                      <div className="sd-section">
                        <h3>📊 Evaluation Criteria</h3>
                        <ul className="eval-list">
                          {systemDesignQuestion.evaluation_criteria.map((criteria, i) => (
                            <li key={i}>{criteria}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="sd-right">
                    <div className="sd-section">
                      <h3>📝 Your Design Notes {sdHasUnsavedChanges && <span className="unsaved-indicator">• Unsaved</span>}</h3>
                      <textarea
                        className="design-notes"
                        value={userResponse}
                        onChange={(e) => {
                          setUserResponse(e.target.value);
                          setSdHasUnsavedChanges(true);
                          setSdSaved(false);
                        }}
                        placeholder="Write your design approach, components, and trade-offs here..."
                        rows={15}
                      />
                      {sdSaved && <div className="saved-indicator">✓ Saved</div>}
                    </div>

                    <button 
                      className="btn-reveal"
                      onClick={() => setShowSolution(!showSolution)}
                    >
                      {showSolution ? '🙈 Hide Solution Guide' : '👁️ Show Solution Guide'}
                    </button>

                    {showSolution && (
                      <div className="sd-solution">
                        {systemDesignQuestion.solution_components && (
                          <div className="solution-section">
                            <h4>🧩 Key Components</h4>
                            {systemDesignQuestion.solution_components.map((comp, i) => (
                              <div key={i} className="component-card">
                                <h5>{comp.component}</h5>
                                <p>{comp.purpose}</p>
                                <div className="tech-options">
                                  <strong>Options:</strong> {comp.technology_options?.join(', ')}
                                </div>
                                <p className="consideration">{comp.considerations}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {systemDesignQuestion.solution_tradeoffs && (
                          <div className="solution-section">
                            <h4>⚖️ Trade-offs</h4>
                            {systemDesignQuestion.solution_tradeoffs.map((tradeoff, i) => (
                              <div key={i} className="tradeoff-card">
                                <h5>{tradeoff.decision}</h5>
                                <div className="pros-cons">
                                  <div className="pros">
                                    <strong>Pros:</strong>
                                    <ul>
                                      {tradeoff.pros?.map((pro, j) => <li key={j}>{pro}</li>)}
                                    </ul>
                                  </div>
                                  <div className="cons">
                                    <strong>Cons:</strong>
                                    <ul>
                                      {tradeoff.cons?.map((con, j) => <li key={j}>{con}</li>)}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {systemDesignQuestion.deep_dives && (
                          <div className="solution-section">
                            <h4>🔍 Deep Dive Topics</h4>
                            {systemDesignQuestion.deep_dives.map((dive, i) => (
                              <div key={i} className="deepdive-card">
                                <h5>{dive.topic}</h5>
                                <div className="dive-questions">
                                  <strong>Questions to expect:</strong>
                                  <ul>
                                    {dive.questions?.map((q, j) => <li key={j}>{q}</li>)}
                                  </ul>
                                </div>
                                <div className="key-points">
                                  <strong>Key points:</strong>
                                  <ul>
                                    {dive.key_points?.map((p, j) => <li key={j}>{p}</li>)}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="sd-actions">
                  <button className="btn-secondary" onClick={handleSdBackToMenu}>
                    ← Back to Menu
                  </button>
                  <button 
                    className={`btn-save ${sdSaved ? 'saved' : ''} ${sdHasUnsavedChanges ? 'has-changes' : ''}`}
                    onClick={saveSystemDesign}
                    disabled={loading || !userResponse.trim()}
                  >
                    {loading ? "Saving..." : sdSaved ? "✓ Saved" : "💾 Save Progress"}
                  </button>
                  <button className="btn-primary" onClick={startSystemDesign}>
                    🔄 New Question
                  </button>
                </div>
                {sdHasUnsavedChanges && (
                  <p className="unsaved-warning">⚠️ You have unsaved changes. Save before leaving or your progress will be lost.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== WHITEBOARD TAB ===== */}
        {activeTab === 'whiteboard' && (
          <>
            {view === 'menu' && (
              <div className="whiteboard-menu">
                <div className="setup-panel">
                  <h2>📋 Whiteboard Practice</h2>
                  <p className="description">
                    Master the art of solving problems on a whiteboard with communication tips and techniques
                  </p>
                  
                  <div className="setup-grid">
                    <div className="setup-field">
                      <label>Tech Stack</label>
                      <select 
                        value={techStack[0]} 
                        onChange={(e) => setTechStack([e.target.value])}
                      >
                        {techStackOptions.map(tech => (
                          <option key={tech} value={tech}>
                            {tech.charAt(0).toUpperCase() + tech.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="setup-field full-width">
                      <label>Topic</label>
                      <div className="category-grid">
                        {categoryOptions.slice(0, 6).map(cat => (
                          <button
                            key={cat.value}
                            className={`category-btn ${category === cat.value ? 'active' : ''}`}
                            onClick={() => setCategory(cat.value)}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="btn-start-challenge"
                    onClick={startWhiteboard}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "🎯 Start Whiteboard Session"}
                  </button>
                </div>
              </div>
            )}

            {view === 'challenge' && whiteboardSession && (
              <div className="whiteboard-view">
                <div className="wb-header">
                  <h2>{whiteboardSession.problem_title}</h2>
                </div>

                <div className="wb-content">
                  <div className="wb-left">
                    <div className="wb-section">
                      <h3>📋 Problem</h3>
                      <p>{whiteboardSession.problem_description}</p>
                    </div>

                    {whiteboardSession.techniques_covered && (
                      <div className="wb-section">
                        <h3>🛠️ Techniques</h3>
                        {whiteboardSession.techniques_covered.map((tech, i) => (
                          <div key={i} className="technique-card">
                            <h4>{tech.technique}</h4>
                            <p>{tech.description}</p>
                            {tech.example && (
                              <div className="technique-example">
                                <strong>Example:</strong> {tech.example}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {whiteboardSession.step_by_step_approach && (
                      <div className="wb-section">
                        <h3>📍 Step-by-Step Approach</h3>
                        {whiteboardSession.step_by_step_approach.map((step, i) => (
                          <div key={i} className="step-card">
                            <div className="step-number">Step {step.step}</div>
                            <h4>{step.action}</h4>
                            <div className="step-details">
                              <div className="what-to-say">
                                <strong>💬 Say:</strong> "{step.what_to_say}"
                              </div>
                              <div className="what-to-write">
                                <strong>✏️ Write:</strong> {step.what_to_write}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="wb-right">
                    {whiteboardSession.communication_tips && (
                      <div className="wb-section">
                        <h3>💬 Communication Tips</h3>
                        {whiteboardSession.communication_tips.map((phase, i) => (
                          <div key={i} className="comm-phase">
                            <h4>{phase.phase}</h4>
                            <ul>
                              {phase.tips?.map((tip, j) => (
                                <li key={j}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {whiteboardSession.time_management && (
                      <div className="wb-section">
                        <h3>⏱️ Time Management</h3>
                        <div className="time-grid">
                          {Object.entries(whiteboardSession.time_management).map(([phase, time]) => (
                            <div key={phase} className="time-item">
                              <span className="phase-name">{phase.replace('_', ' ')}</span>
                              <span className="phase-time">{time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {whiteboardSession.body_language_tips && (
                      <div className="wb-section">
                        <h3>🧍 Body Language</h3>
                        <ul className="body-tips">
                          {whiteboardSession.body_language_tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {whiteboardSession.common_mistakes_to_avoid && (
                      <div className="wb-section warning">
                        <h3>⚠️ Common Mistakes</h3>
                        <ul>
                          {whiteboardSession.common_mistakes_to_avoid.map((mistake, i) => (
                            <li key={i}>{mistake}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="wb-actions">
                  <button className="btn-secondary" onClick={resetToMenu}>
                    ← Back to Menu
                  </button>
                  <button className="btn-primary" onClick={startWhiteboard}>
                    🔄 New Session
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== QUESTION GENERATOR TAB ===== */}
        {activeTab === 'questions' && (
          <div className="questions-tab">
            <div className="setup-panel">
              <h2>❓ Technical Question Generator</h2>
              <p className="description">
                Generate interview questions based on your target job and tech stack
              </p>
              
              <div className="setup-grid">
                <div className="setup-field full-width">
                  <label>Job Description (optional)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here to get tailored questions..."
                    rows={4}
                  />
                </div>
                
                <div className="setup-field">
                  <label>Tech Stack</label>
                  <select 
                    value={techStack[0]} 
                    onChange={(e) => setTechStack([e.target.value])}
                  >
                    {techStackOptions.map(tech => (
                      <option key={tech} value={tech}>
                        {tech.charAt(0).toUpperCase() + tech.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="setup-field">
                  <label>Seniority Level</label>
                  <div className="seniority-selector">
                    {['junior', 'mid', 'senior', 'staff'].map(level => (
                      <button
                        key={level}
                        className={`seniority-btn ${seniorityLevel === level ? 'active' : ''}`}
                        onClick={() => setSeniorityLevel(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <button 
                className="btn-start-challenge"
                onClick={generateQuestions}
                disabled={loading}
              >
                {loading ? "Generating..." : "🎯 Generate Questions"}
              </button>
            </div>

            {generatedQuestions && (
              <div className="generated-questions">
                {generatedQuestions.coding_questions?.length > 0 && (
                  <div className="question-category">
                    <h3>⌨️ Coding Questions</h3>
                    <div className="question-list">
                      {generatedQuestions.coding_questions.map((q, i) => (
                        <div key={i} className="question-card">
                          <div className="question-header">
                            <span className={`difficulty ${q.difficulty}`}>{q.difficulty}</span>
                            <span className="topics">{q.topics?.join(', ')}</span>
                          </div>
                          <p className="question-text">{q.question}</p>
                          <div className="question-meta">
                            <strong>What they test:</strong> {q.what_they_test}
                          </div>
                          <div className="answer-points">
                            <strong>Key points:</strong>
                            <ul>
                              {q.sample_answer_points?.map((point, j) => (
                                <li key={j}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedQuestions.system_design_questions?.length > 0 && (
                  <div className="question-category">
                    <h3>🏗️ System Design Questions</h3>
                    <div className="question-list">
                      {generatedQuestions.system_design_questions.map((q, i) => (
                        <div key={i} className="question-card">
                          <div className="question-header">
                            <span className={`difficulty ${q.difficulty}`}>{q.difficulty}</span>
                          </div>
                          <p className="question-text">{q.question}</p>
                          <div className="key-components">
                            <strong>Key components:</strong>
                            <ul>
                              {q.key_components?.map((comp, j) => (
                                <li key={j}>{comp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedQuestions.conceptual_questions?.length > 0 && (
                  <div className="question-category">
                    <h3>💡 Conceptual Questions</h3>
                    <div className="question-list">
                      {generatedQuestions.conceptual_questions.map((q, i) => (
                        <div key={i} className="question-card">
                          <div className="question-header">
                            <span className="topic-tag">{q.topic}</span>
                            <span className={`depth ${q.depth}`}>{q.depth}</span>
                          </div>
                          <p className="question-text">{q.question}</p>
                          <div className="expected-answer">
                            <strong>Expected:</strong> {q.expected_answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedQuestions.real_world_scenarios?.length > 0 && (
                  <div className="question-category">
                    <h3>🌍 Real-World Scenarios</h3>
                    <div className="question-list">
                      {generatedQuestions.real_world_scenarios.map((q, i) => (
                        <div key={i} className="question-card">
                          <p className="question-text">{q.scenario}</p>
                          <div className="scenario-context">
                            <strong>Context:</strong> {q.context}
                          </div>
                          <div className="technical-challenge">
                            <strong>Technical Challenge:</strong> {q.technical_challenge}
                          </div>
                          <div className="good-answer">
                            <strong>Good answer includes:</strong>
                            <ul>
                              {q.good_answer_includes?.map((point, j) => (
                                <li key={j}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedQuestions.behavioral_technical?.length > 0 && (
                  <div className="question-category">
                    <h3>🎭 Behavioral-Technical Questions</h3>
                    <div className="question-list">
                      {generatedQuestions.behavioral_technical.map((q, i) => (
                        <div key={i} className="question-card">
                          <p className="question-text">{q.question}</p>
                          <div className="what-they-want">
                            <strong>What they want:</strong> {q.what_they_want}
                          </div>
                          <div className="star-tips">
                            <strong>STAR tips:</strong> {q.star_tips}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== FRAMEWORKS TAB ===== */}
        {activeTab === 'frameworks' && frameworks && (
          <div className="frameworks-tab">
            <h2>📚 Solution Frameworks & Best Practices</h2>
            
            <div className="frameworks-section">
              <h3>⌨️ Coding Patterns</h3>
              <div className="frameworks-grid">
                {Object.entries(frameworks.coding || {}).map(([name, data]) => (
                  <div key={name} className="framework-card">
                    <h4>{name}</h4>
                    <p className="framework-desc">{data.description}</p>
                    <div className="when-to-use">
                      <strong>When to use:</strong>
                      <ul>
                        {data.when_to_use?.map((use, i) => (
                          <li key={i}>{use}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="template">
                      <strong>Template:</strong>
                      <pre>{data.template}</pre>
                    </div>
                    <div className="complexity">
                      <em>{data.complexity}</em>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="frameworks-section">
              <h3>🏗️ System Design Concepts</h3>
              <div className="frameworks-grid">
                {Object.entries(frameworks.systemDesign || {}).map(([name, data]) => (
                  <div key={name} className="framework-card">
                    <h4>{name}</h4>
                    <p className="framework-desc">{data.description}</p>
                    <div className="strategies">
                      <strong>Strategies:</strong>
                      <ul>
                        {data.strategies?.map((strat, i) => (
                          <li key={i}>{strat}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="considerations">
                      <strong>Considerations:</strong> {data.considerations}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="frameworks-section">
              <h3>✨ Best Practices</h3>
              <div className="best-practices-grid">
                <div className="bp-card">
                  <h4>🎤 Interview Tips</h4>
                  <ul>
                    {frameworks.bestPractices?.interview?.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="bp-card">
                  <h4>💻 Coding Tips</h4>
                  <ul>
                    {frameworks.bestPractices?.coding?.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

