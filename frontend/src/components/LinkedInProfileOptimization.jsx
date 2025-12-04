import React, { useState } from 'react';
import axios from 'axios';
import './LinkedInProfileOptimization.css';
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';

const LinkedInProfileOptimization = ({ userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [optimizationData, setOptimizationData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

  const fetchOptimization = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE}/linkedin/optimize-profile`,
        {
          headline: userProfile?.headline || '',
          about: userProfile?.about || '',
          skills: userProfile?.skills || [],
          title: userProfile?.job_title || '',
          company: userProfile?.company_name || '',
          industry: userProfile?.industry || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Optimization data received:', response.data);
      setOptimizationData(response.data);
    } catch (err) {
      console.error('Error fetching optimization:', err);
      setError(err.response?.data?.error || 'Failed to fetch optimization suggestions');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="severity-icon high" />;
      case 'medium':
        return <AlertTriangle className="severity-icon medium" />;
      case 'low':
        return <CheckCircle className="severity-icon low" />;
      default:
        return <Lightbulb className="severity-icon" />;
    }
  };

  const getSeverityBadge = (severity) => {
    return <span className={`severity-badge ${severity}`}>{severity.toUpperCase()}</span>;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const ScoreGauge = ({ score, label }) => (
    <div className="score-gauge">
      <div className="gauge-circle" style={{ borderColor: getScoreColor(score) }}>
        <span className="gauge-score" style={{ color: getScoreColor(score) }}>
          {score}
        </span>
      </div>
      <p className="gauge-label">{label}</p>
    </div>
  );

  if (!optimizationData && !loading && !error) {
    return (
      <div className="optimization-container">
        <div className="optimization-header">
          <div className="header-content">
            <TrendingUp className="header-icon" />
            <div>
              <h2>LinkedIn Profile Optimization</h2>
              <p>Get AI-powered suggestions to improve your LinkedIn profile visibility and attract opportunities</p>
            </div>
          </div>
          <button 
            className="btn-primary analyze-btn"
            onClick={fetchOptimization}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze My Profile'}
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="optimization-container">
      <div className="optimization-header">
        <div className="header-content">
          <TrendingUp className="header-icon" />
          <div>
            <h2>LinkedIn Profile Optimization</h2>
            <p>AI-powered suggestions to improve your profile</p>
          </div>
        </div>
        <button 
          className="btn-secondary refresh-btn"
          onClick={fetchOptimization}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing your LinkedIn profile...</p>
        </div>
      )}

      {optimizationData && (
        <>
          {/* OVERALL SCORE SECTION */}
          <div className="score-summary">
            <h3>Overall Profile Score</h3>
            <div className="score-display">
              <ScoreGauge 
                score={optimizationData.overall_score} 
                label="Overall"
              />
              <ScoreGauge 
                score={optimizationData.scores.headline_optimization_score}
                label="Headline"
              />
              <ScoreGauge 
                score={optimizationData.scores.about_section_optimization_score}
                label="About Section"
              />
              <ScoreGauge 
                score={optimizationData.scores.skills_optimization_score}
                label="Skills"
              />
              <ScoreGauge 
                score={optimizationData.scores.recommendations_score}
                label="Social Proof"
              />
            </div>
          </div>

          {/* SUGGESTIONS SECTION */}
          <div className="suggestions-section">
            <h3>Optimization Suggestions</h3>
            <div className="suggestions-list">
              {optimizationData.suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className={`suggestion-card ${suggestion.severity}`}
                  onClick={() => setSelectedCategory(selectedCategory === index ? null : index)}
                >
                  <div className="suggestion-header">
                    <div className="header-left">
                      {getSeverityIcon(suggestion.severity)}
                      <div className="header-text">
                        <h4>{suggestion.category.replace('_', ' ').toUpperCase()}</h4>
                        <p className="suggestion-text">{suggestion.suggestion}</p>
                      </div>
                    </div>
                  </div>

                  {selectedCategory === index && (
                    <div className="suggestion-details">
                      <div className="detail-section">
                        <h5>Current Status:</h5>
                        <p className="current-status">{suggestion.current}</p>
                      </div>

                      <div className="detail-section">
                        <h5>Recommendation:</h5>
                        <div className="recommendation-box">
                          {suggestion.recommendation}
                        </div>
                      </div>

                      <div className="detail-section">
                        <h5>Impact:</h5>
                        <p className="impact-text">📊 {suggestion.impact}</p>
                      </div>

                      {suggestion.category === 'headline' && (
                        <button 
                          className="btn-small btn-copy"
                          onClick={() => {
                            navigator.clipboard.writeText(suggestion.recommendation);
                            alert('Recommendation copied to clipboard!');
                          }}
                        >
                          Copy Suggestion
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ACTION ITEMS SECTION */}
          <div className="action-items">
            <h3>Next Steps</h3>
            <div className="action-list">
              {optimizationData?.scores?.headline_optimization_score < 80 && (
                <div className="action-item priority-high">
                  <div className="action-number">1</div>
                  <div className="action-content">
                    <h5>Optimize Your Headline</h5>
                    <p>Use the recommended headline to improve visibility in search results by up to 40%</p>
                  </div>
                </div>
              )}
              {optimizationData?.scores?.about_section_optimization_score < 80 && (
                <div className="action-item priority-high">
                  <div className="action-number">2</div>
                  <div className="action-content">
                    <h5>Enhance Your About Section</h5>
                    <p>Add a compelling professional summary that includes your key achievements</p>
                  </div>
                </div>
              )}
              {optimizationData?.scores?.skills_optimization_score < 80 && (
                <div className="action-item priority-high">
                  <div className="action-number">3</div>
                  <div className="action-content">
                    <h5>Build Your Skills Section</h5>
                    <p>Add 10-15 relevant skills and ask connections to endorse them</p>
                  </div>
                </div>
              )}
              {optimizationData?.scores?.recommendations_score < 80 && (
                <div className="action-item priority-medium">
                  <div className="action-number">4</div>
                  <div className="action-content">
                    <h5>Request Recommendations</h5>
                    <p>Reach out to former colleagues and managers for recommendations</p>
                  </div>
                </div>
              )}
              {optimizationData?.scores?.overall_optimization_score >= 80 ? (
                <div className="action-item priority-low">
                  <div className="action-number">✓</div>
                  <div className="action-content">
                    <h5>Great Job!</h5>
                    <p>Your profile is well-optimized. Continue to update regularly every 3-6 months to stay current.</p>
                  </div>
                </div>
              ) : (
                <div className="action-item priority-low">
                  <div className="action-number">5</div>
                  <div className="action-content">
                    <h5>Update Regularly</h5>
                    <p>Review and refresh your profile every 3-6 months to stay current</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BEST PRACTICES SECTION */}
          <div className="best-practices">
            <h3>LinkedIn Best Practices</h3>
            <div className="practice-grid">
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Use Keywords</h5>
                <p>Include industry-specific keywords that recruiters search for</p>
              </div>
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Be Authentic</h5>
                <p>Let your personality shine through while maintaining professionalism</p>
              </div>
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Show Your Work</h5>
                <p>Include projects, articles, and media that showcase your expertise</p>
              </div>
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Stay Active</h5>
                <p>Engage with content and share insights regularly</p>
              </div>
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Network Authentically</h5>
                <p>Build genuine relationships with personalized connection messages</p>
              </div>
              <div className="practice-card">
                <Lightbulb className="practice-icon" />
                <h5>Profile Picture</h5>
                <p>Use a professional, high-quality headshot for better engagement</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LinkedInProfileOptimization;
