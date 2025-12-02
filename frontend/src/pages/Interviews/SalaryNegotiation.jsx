import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { getUserId } from "../../utils/auth";
import "./SalaryNegotiation.css";

export default function SalaryNegotiation() {
  const [companies, setCompanies] = useState([]);
  const [roleMap, setRoleMap] = useState({});
  const [negotiations, setNegotiations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [activeView, setActiveView] = useState("list"); // list, view, generate, resources
  const [profileData, setProfileData] = useState(null); // ✅ Store profile data

  // Generator form state
  const [generatorForm, setGeneratorForm] = useState({
    company: "",
    role: "",
    location: "",
    experienceYears: "",
    currentSalary: "",
    offerAmount: "",
    marketData: null
  });

  const userId = getUserId();

  /* ============================================================
     Load profile data on mount
  ============================================================ */
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get("/api/profile");
        const profile = res.data.profile;
        setProfileData(profile);
        
        // Auto-populate experience years if available
        if (profile?.totalExperience) {
          setGeneratorForm(prev => ({
            ...prev,
            experienceYears: profile.totalExperience.toString()
          }));
        }
        
        // Auto-populate location if available
        if (profile?.location) {
          setGeneratorForm(prev => ({
            ...prev,
            location: profile.location
          }));
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    }
    loadProfile();
  }, []);

  /* ============================================================
     Load companies from jobs
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
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }
    loadJobs();
  }, []);

  /* ============================================================
     Load negotiations and stats on mount
  ============================================================ */
  useEffect(() => {
    fetchNegotiations();
    fetchStats();
  }, []);

  /* ============================================================
     Fetch negotiations
  ============================================================ */
  async function fetchNegotiations() {
    try {
      setLoading(true);
      const res = await api.get("/api/salary-negotiation/list", {
        params: { userId }
      });
      setNegotiations(res.data.data.negotiations || []);
    } catch (err) {
      console.error("Error fetching negotiations:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Fetch statistics
  ============================================================ */
  async function fetchStats() {
    try {
      const res = await api.get("/api/salary-negotiation/stats", {
        params: { userId }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }

  /* ============================================================
     Generate new negotiation package
  ============================================================ */
  async function generatePackage() {
    if (!generatorForm.company || !generatorForm.role) {
      alert("Please select a company and role");
      return;
    }

    try {
      setLoading(true);
      
      const res = await api.post("/api/salary-negotiation/generate", {
        userId,
        company: generatorForm.company,
        role: generatorForm.role,
        location: generatorForm.location || null,
        experienceYears: generatorForm.experienceYears ? parseInt(generatorForm.experienceYears) : null,
        currentSalary: generatorForm.currentSalary ? parseFloat(generatorForm.currentSalary) : null,
        offerAmount: generatorForm.offerAmount ? parseFloat(generatorForm.offerAmount) : null,
        marketData: generatorForm.marketData
      });

      setSelectedNegotiation(res.data.data);
      setActiveView("view");
      setShowGenerator(false);
      
      await fetchNegotiations();
      await fetchStats();
      
      // Reset form
      setGeneratorForm({
        company: "",
        role: "",
        location: "",
        experienceYears: "",
        currentSalary: "",
        offerAmount: "",
        marketData: null
      });
    } catch (err) {
      console.error("Error generating package:", err);
      alert("Failed to generate negotiation package. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Update negotiation
  ============================================================ */
  async function updateNegotiation(negotiationId, updates) {
    try {
      await api.put(`/api/salary-negotiation/${negotiationId}/update`, {
        userId,
        ...updates
      });
      
      await fetchNegotiations();
      
      if (selectedNegotiation && selectedNegotiation.id === negotiationId) {
        const res = await api.get(`/api/salary-negotiation/${negotiationId}`, {
          params: { userId }
        });
        setSelectedNegotiation(res.data.data);
      }
    } catch (err) {
      console.error("Error updating negotiation:", err);
      alert("Failed to update. Please try again.");
    }
  }

  /* ============================================================
     Track outcome
  ============================================================ */
  async function trackOutcome(negotiationId, outcomeType, finalAmount) {
    const notes = prompt("Any notes about this negotiation? (Optional)");
    const lessonsInput = prompt("What did you learn from this negotiation? (Optional)");
    const ratingInput = prompt("Rate your satisfaction (1-5):");
    const rating = ratingInput ? parseInt(ratingInput) : null;

    if (rating && (rating < 1 || rating > 5)) {
      alert("Please enter a rating between 1 and 5");
      return;
    }

    try {
      await api.put(`/api/salary-negotiation/${negotiationId}/outcome`, {
        userId,
        outcomeType,
        outcomeNotes: notes || null,
        lessonsLearned: lessonsInput || null,
        satisfactionRating: rating,
        finalAcceptedAmount: finalAmount
      });
      
      await fetchNegotiations();
      await fetchStats();
      
      if (selectedNegotiation && selectedNegotiation.id === negotiationId) {
        const res = await api.get(`/api/salary-negotiation/${negotiationId}`, {
          params: { userId }
        });
        setSelectedNegotiation(res.data.data);
      }
      
      alert("✅ Outcome tracked successfully!");
    } catch (err) {
      console.error("Error tracking outcome:", err);
      alert("Failed to track outcome. Please try again.");
    }
  }

  /* ============================================================
     Delete negotiation
  ============================================================ */
  async function deleteNegotiation(negotiationId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this negotiation package? This cannot be undone."
    );
    
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await api.delete(`/api/salary-negotiation/${negotiationId}`, {
        params: { userId }
      });
      
      await fetchNegotiations();
      await fetchStats();
      
      // If viewing the deleted negotiation, go back to list
      if (selectedNegotiation && selectedNegotiation.id === negotiationId) {
        setSelectedNegotiation(null);
        setActiveView("list");
      }
      
      alert("✅ Negotiation deleted successfully!");
    } catch (err) {
      console.error("Error deleting negotiation:", err);
      alert("Failed to delete negotiation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     Helper functions
  ============================================================ */
  function formatCurrency(amount) {
    if (!amount) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  }

  function getStatusBadge(status) {
    const badges = {
      researching: { label: "🔍 Researching", color: "#3b82f6" },
      preparing: { label: "📝 Preparing", color: "#f59e0b" },
      negotiating: { label: "💬 Negotiating", color: "#8b5cf6" },
      completed: { label: "✅ Completed", color: "#10b981" },
      declined: { label: "❌ Declined", color: "#ef4444" }
    };
    return badges[status] || badges.researching;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  }

  return (
    <div className="salary-negotiation-container">
      <h1 className="page-title">💰 Salary Negotiation Preparation</h1>
      <p className="page-subtitle">Confidently negotiate your best offer</p>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="stats-dashboard">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Negotiations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.successfulCounters}</div>
            <div className="stat-label">Successful Counters</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avgIncrease}%</div>
            <div className="stat-label">Avg Increase</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.avgSatisfaction}/5</div>
            <div className="stat-label">Avg Satisfaction</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className={`view-btn ${activeView === "list" ? "active" : ""}`}
          onClick={() => {
            setActiveView("list");
            setShowGenerator(false);
            setSelectedNegotiation(null);
          }}
        >
          📋 My Negotiations
        </button>
        <button 
          className={`view-btn ${activeView === "resources" ? "active" : ""}`}
          onClick={() => {
            setActiveView("resources");
            setShowGenerator(false);
            setSelectedNegotiation(null);
          }}
        >
          📚 Resources & Tips
        </button>
        <button 
          className="generate-btn"
          onClick={() => {
            setShowGenerator(true);
            setActiveView("generate");
            setSelectedNegotiation(null);
          }}
        >
          ✨ Start New Negotiation
        </button>
      </div>

      {/* Generator Form */}
      {showGenerator && activeView === "generate" && (
        <div className="generator-form">
          <button 
            className="back-btn-small"
            onClick={() => {
              setShowGenerator(false);
              setActiveView("list");
            }}
          >
            ← Back
          </button>

          <h3>Create Negotiation Package</h3>
          
          {/* Profile Info Banner */}
          {profileData && (profileData.totalExperience || profileData.location) && (
            <div className="profile-info-banner">
              <span className="banner-icon">👤</span>
              <div className="banner-content">
                <strong>Using your profile data:</strong>
                {profileData.totalExperience && (
                  <span> {profileData.totalExperience} years experience</span>
                )}
                {profileData.location && profileData.totalExperience && <span> • </span>}
                {profileData.location && (
                  <span>{profileData.location}</span>
                )}
              </div>
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label>Company *</label>
              <select
                value={generatorForm.company}
                onChange={(e) => {
                  setGeneratorForm(prev => ({ 
                    ...prev, 
                    company: e.target.value,
                    role: ""
                  }));
                }}
                required
              >
                <option value="">Select company...</option>
                {companies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select
                value={generatorForm.role}
                onChange={(e) => setGeneratorForm(prev => ({ ...prev, role: e.target.value }))}
                disabled={!generatorForm.company}
                required
              >
                <option value="">Select role...</option>
                {generatorForm.company && roleMap[generatorForm.company]?.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location (Optional)</label>
              <input
                type="text"
                placeholder="e.g., San Francisco, CA"
                value={generatorForm.location}
                onChange={(e) => setGeneratorForm(prev => ({ ...prev, location: e.target.value }))}
              />
              {profileData?.location && generatorForm.location === profileData.location && (
                <small className="form-helper">✓ From your profile</small>
              )}
            </div>

            <div className="form-group">
              <label>Years of Experience (Optional)</label>
              <input
                type="number"
                placeholder="e.g., 5"
                value={generatorForm.experienceYears}
                onChange={(e) => setGeneratorForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                min="0"
              />
              {profileData?.totalExperience && generatorForm.experienceYears === profileData.totalExperience.toString() && (
                <small className="form-helper">✓ From your profile</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Current Salary (Optional)</label>
              <input
                type="number"
                placeholder="e.g., 100000"
                value={generatorForm.currentSalary}
                onChange={(e) => setGeneratorForm(prev => ({ ...prev, currentSalary: e.target.value }))}
                min="0"
              />
              <small className="form-helper">Helps determine appropriate counter-offer</small>
            </div>

            <div className="form-group">
              <label>Offer Amount (Optional)</label>
              <input
                type="number"
                placeholder="e.g., 120000"
                value={generatorForm.offerAmount}
                onChange={(e) => setGeneratorForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                min="0"
              />
              <small className="form-helper">If you've already received an offer</small>
            </div>
          </div>

          <button 
            className="submit-btn"
            onClick={generatePackage}
            disabled={loading || !generatorForm.company || !generatorForm.role}
          >
            {loading ? "Generating Package..." : "✨ Generate Negotiation Package"}
          </button>
        </div>
      )}

      {/* Selected Negotiation View */}
      {selectedNegotiation && activeView === "view" && (
        <div className="negotiation-view">
          <button 
            className="back-to-list-btn"
            onClick={() => {
              setSelectedNegotiation(null);
              setActiveView("list");
            }}
          >
            ← Back to List
          </button>

          <div className="negotiation-header">
            <div>
              <h2>{selectedNegotiation.company} - {selectedNegotiation.role}</h2>
              <div className="negotiation-meta">
                <span style={{ 
                  color: getStatusBadge(selectedNegotiation.negotiation_status).color,
                  fontWeight: 600
                }}>
                  {getStatusBadge(selectedNegotiation.negotiation_status).label}
                </span>
                {selectedNegotiation.location && (
                  <span> • {selectedNegotiation.location}</span>
                )}
                {selectedNegotiation.experience_years && (
                  <span> • {selectedNegotiation.experience_years} years exp</span>
                )}
              </div>
            </div>
            <button 
              className="delete-btn-header"
              onClick={() => deleteNegotiation(selectedNegotiation.id)}
              title="Delete this negotiation package"
            >
              🗑️ Delete
            </button>
          </div>

          {/* Market Research */}
          {selectedNegotiation.market_research && (
            <div className="section market-research-section">
              <h3>📊 Market Research</h3>
              <div className="salary-ranges">
                <div className="salary-range-item">
                  <div className="range-label">Minimum</div>
                  <div className="range-value">{formatCurrency(selectedNegotiation.market_research.min)}</div>
                </div>
                <div className="salary-range-item">
                  <div className="range-label">25th Percentile</div>
                  <div className="range-value">{formatCurrency(selectedNegotiation.market_research.percentile25)}</div>
                </div>
                <div className="salary-range-item highlight">
                  <div className="range-label">Median</div>
                  <div className="range-value">{formatCurrency(selectedNegotiation.market_research.median)}</div>
                </div>
                <div className="salary-range-item">
                  <div className="range-label">75th Percentile</div>
                  <div className="range-value">{formatCurrency(selectedNegotiation.market_research.percentile75)}</div>
                </div>
                <div className="salary-range-item">
                  <div className="range-label">Maximum</div>
                  <div className="range-value">{formatCurrency(selectedNegotiation.market_research.max)}</div>
                </div>
              </div>
              {selectedNegotiation.market_research.analysis && (
                <div className="market-analysis">
                  <p>{selectedNegotiation.market_research.analysis}</p>
                </div>
              )}
              {selectedNegotiation.market_research.sources && (
                <div className="sources">
                  <strong>Sources:</strong> {selectedNegotiation.market_research.sources.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Company-Specific Insights - AI-GENERATED */}
          {selectedNegotiation.company_insights && (
            <div className="section company-insights-section">
              <h3>🏢 {selectedNegotiation.company}-Specific Insights</h3>
              <p className="section-intro">Understand how {selectedNegotiation.company} typically handles compensation and negotiations</p>
              <div className="insights-grid">
                <div className="insight-card">
                  <div className="insight-icon">🏢</div>
                  <h4>Company Type & Culture</h4>
                  <p><strong>Type:</strong> {selectedNegotiation.company_insights.companyType}</p>
                  <p>{selectedNegotiation.company_insights.compensationPhilosophy}</p>
                  {selectedNegotiation.company_insights.currentSituation && (
                    <p className="current-situation"><strong>Current:</strong> {selectedNegotiation.company_insights.currentSituation}</p>
                  )}
                </div>
                <div className="insight-card">
                  <div className="insight-icon">🤝</div>
                  <h4>Negotiation Approach</h4>
                  <p>{selectedNegotiation.company_insights.negotiationReputation}</p>
                </div>
                <div className="insight-card">
                  <div className="insight-icon">💪</div>
                  <h4>Your Leverage</h4>
                  <p>{selectedNegotiation.company_insights.leveragePoints}</p>
                </div>
              </div>
              <div className="insight-note">
                💡 These insights are AI-generated and based on {selectedNegotiation.company}'s public information, your role, and market conditions.
              </div>
            </div>
          )}

          {/* Role & Location Context - AI-GENERATED */}
          {(selectedNegotiation.role_insights || selectedNegotiation.location_insights) && (
            <div className="section context-section">
              <h3>🎯 Your Specific Context</h3>
              <div className="context-grid">
                {selectedNegotiation.role_insights && (
                  <div className="context-card">
                    <div className="context-icon">💼</div>
                    <h4>{selectedNegotiation.role} Market</h4>
                    <ul>
                      <li><strong>Demand:</strong> {selectedNegotiation.role_insights.demandLevel}</li>
                      {selectedNegotiation.role_insights.marketTrends && (
                        <li><strong>Trends:</strong> {selectedNegotiation.role_insights.marketTrends}</li>
                      )}
                      <li><strong>Leverage:</strong> {selectedNegotiation.role_insights.roleSpecificLeverage}</li>
                      {selectedNegotiation.role_insights.typicalEquityRange && (
                        <li><strong>Equity:</strong> {selectedNegotiation.role_insights.typicalEquityRange}</li>
                      )}
                      {selectedNegotiation.role_insights.careerGrowth && (
                        <li><strong>Growth:</strong> {selectedNegotiation.role_insights.careerGrowth}</li>
                      )}
                    </ul>
                  </div>
                )}
                {selectedNegotiation.location_insights && selectedNegotiation.location && (
                  <div className="context-card">
                    <div className="context-icon">📍</div>
                    <h4>{selectedNegotiation.location} Factors</h4>
                    <ul>
                      <li><strong>COL:</strong> {selectedNegotiation.location_insights.costOfLiving}</li>
                      <li><strong>Market:</strong> {selectedNegotiation.location_insights.localMarketFactors}</li>
                      {selectedNegotiation.location_insights.remoteFlexibility && (
                        <li><strong>Remote:</strong> {selectedNegotiation.location_insights.remoteFlexibility}</li>
                      )}
                      {selectedNegotiation.location_insights.taxImplications && (
                        <li><strong>Taxes:</strong> {selectedNegotiation.location_insights.taxImplications}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offer-Specific Analysis - NEW PERSONALIZED SECTION */}
          {selectedNegotiation.initial_offer_amount && selectedNegotiation.market_research && (
            <div className="section offer-analysis-section">
              <h3>🔍 Your Offer vs Market Analysis</h3>
              <div className="analysis-grid">
                <div className="analysis-card">
                  <h4>Base Salary Position</h4>
                  <div className="analysis-value">
                    {selectedNegotiation.market_research.median ? (
                      <>
                        <span className={selectedNegotiation.initial_offer_amount < selectedNegotiation.market_research.median ? 'value-below' : 'value-above'}>
                          {Math.abs(((selectedNegotiation.initial_offer_amount - selectedNegotiation.market_research.median) / selectedNegotiation.market_research.median * 100)).toFixed(1)}%
                        </span>
                        <span className="value-label">
                          {selectedNegotiation.initial_offer_amount < selectedNegotiation.market_research.median ? ' below' : ' above'} market median
                        </span>
                      </>
                    ) : 'Analyzing...'}
                  </div>
                </div>
                <div className="analysis-card">
                  <h4>Overall Assessment</h4>
                  <div className="assessment-badge">
                    {selectedNegotiation.initial_offer_amount >= selectedNegotiation.market_research.median ? 
                      <span className="badge-strong">✓ Competitive Offer</span> : 
                      <span className="badge-below">⚠️ Below Market Average</span>
                    }
                  </div>
                </div>
                <div className="analysis-card">
                  <h4>Recommended Counter</h4>
                  <div className="analysis-value">
                    <span className="value-above">{formatCurrency(selectedNegotiation.target_salary)}</span>
                    <span className="value-label">
                      (+{((selectedNegotiation.target_salary - selectedNegotiation.initial_offer_amount) / selectedNegotiation.initial_offer_amount * 100).toFixed(1)}% increase)
                    </span>
                  </div>
                </div>
              </div>
              <div className="improvement-section">
                <h4>Specific Gaps to Address:</h4>
                <div className="gaps-grid">
                  <div className="gap-item">
                    <span className="gap-label">Base Salary:</span>
                    <span className="gap-value">Target {formatCurrency(selectedNegotiation.target_salary)} to match market</span>
                  </div>
                  <div className="gap-item">
                    <span className="gap-label">Signing Bonus:</span>
                    <span className="gap-value">Request {formatCurrency(Math.round(selectedNegotiation.initial_offer_amount * 0.15))} to bridge gap</span>
                  </div>
                  {selectedNegotiation.pto_days && selectedNegotiation.pto_days < 20 && (
                    <div className="gap-item">
                      <span className="gap-label">PTO:</span>
                      <span className="gap-value">{selectedNegotiation.pto_days} days is below 20-day average</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Offer Tracking */}
          <div className="section offer-tracking-section">
            <h3>💵 Offer Tracking</h3>
            <div className="offer-amounts">
              <div className="offer-item">
                <label>Initial Offer:</label>
                <input
                  type="number"
                  value={selectedNegotiation.initial_offer_amount || ""}
                  onChange={(e) => updateNegotiation(selectedNegotiation.id, {
                    initialOfferAmount: parseFloat(e.target.value) || null
                  })}
                  placeholder="Enter amount..."
                />
              </div>
              <div className="offer-item">
                <label>Target/Counter:</label>
                <div className="target-amount">
                  {formatCurrency(selectedNegotiation.target_salary)}
                </div>
              </div>
              <div className="offer-item">
                <label>Counter Offer:</label>
                <input
                  type="number"
                  value={selectedNegotiation.counter_offer_amount || ""}
                  onChange={(e) => updateNegotiation(selectedNegotiation.id, {
                    counterOfferAmount: parseFloat(e.target.value) || null
                  })}
                  placeholder="Enter amount..."
                />
              </div>
              <div className="offer-item">
                <label>Final Accepted:</label>
                <input
                  type="number"
                  value={selectedNegotiation.final_accepted_amount || ""}
                  onChange={(e) => updateNegotiation(selectedNegotiation.id, {
                    finalAcceptedAmount: parseFloat(e.target.value) || null
                  })}
                  placeholder="Enter amount..."
                />
              </div>
            </div>
          </div>

          {/* Talking Points */}
          {selectedNegotiation.talking_points && selectedNegotiation.talking_points.length > 0 && (
            <div className="section talking-points-section">
              <h3>💡 Your Negotiation Talking Points</h3>
              <ul className="talking-points-list">
                {selectedNegotiation.talking_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Counter-Offer Strategy */}
          {selectedNegotiation.counter_offer_strategy && (
            <div className="section strategy-section">
              <h3>🎯 Counter-Offer Strategy</h3>
              <div className="strategy-content">
                <p>{selectedNegotiation.counter_offer_strategy}</p>
              </div>
            </div>
          )}

          {/* Benefits Guidance */}
          {selectedNegotiation.benefits_guidance && (
            <div className="section benefits-section">
              <h3>🎁 Benefits to Negotiate</h3>
              <div className="benefits-grid">
                {Object.entries(selectedNegotiation.benefits_guidance).map(([benefit, details]) => (
                  <div key={benefit} className="benefit-card">
                    <h4>{benefit.charAt(0).toUpperCase() + benefit.slice(1)}</h4>
                    {details.importance && (
                      <div className="benefit-importance">
                        Importance: <span className={`importance-${details.importance}`}>
                          {details.importance}
                        </span>
                      </div>
                    )}
                    {details.typical && (
                      <div className="benefit-typical">
                        <strong>Typical:</strong> {details.typical}
                      </div>
                    )}
                    {details.negotiationTips && (
                      <div className="benefit-tips">
                        <strong>Tips:</strong>
                        <ul>
                          {details.negotiationTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Templates */}
          {selectedNegotiation.email_templates && (
            <div className="section email-templates-section">
              <h3>📧 Email Templates</h3>
              <div className="email-templates-grid">
                {Object.entries(selectedNegotiation.email_templates).map(([type, template]) => (
                  <div key={type} className="email-template-card">
                    <div className="template-header-email">
                      <h4>{type.split(/(?=[A-Z])/).join(' ')}</h4>
                      <button 
                        className="copy-btn-small"
                        onClick={() => copyToClipboard(`Subject: ${template.subject}\n\n${template.body}`)}
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="template-subject">
                      <strong>Subject:</strong> {template.subject}
                    </div>
                    <div className="template-body">
                      <pre>{template.body}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Resources Link */}
          <div className="section resources-link-section">
            <h3>📚 Need More Help?</h3>
            <p>Check out our comprehensive negotiation resources for frameworks, checklists, and confidence exercises.</p>
            <button 
              className="resources-link-btn"
              onClick={() => {
                setActiveView("resources");
                setSelectedNegotiation(null);
              }}
            >
              View Negotiation Resources →
            </button>
          </div>

          {/* Outcome Tracking */}
          {selectedNegotiation.negotiation_status !== 'completed' && (
            <div className="section outcome-section">
              <h3>📊 Track Outcome</h3>
              <p>When you've completed this negotiation, track the outcome:</p>
              <div className="outcome-buttons">
                <button 
                  className="outcome-btn success"
                  onClick={() => trackOutcome(
                    selectedNegotiation.id, 
                    'accepted_counter',
                    selectedNegotiation.counter_offer_amount || selectedNegotiation.target_salary
                  )}
                >
                  ✅ Accepted Counter-Offer
                </button>
                <button 
                  className="outcome-btn success"
                  onClick={() => trackOutcome(
                    selectedNegotiation.id, 
                    'accepted_initial',
                    selectedNegotiation.initial_offer_amount
                  )}
                >
                  ✅ Accepted Initial Offer
                </button>
                <button 
                  className="outcome-btn warning"
                  onClick={() => trackOutcome(selectedNegotiation.id, 'declined_by_company', null)}
                >
                  ❌ Declined by Company
                </button>
                <button 
                  className="outcome-btn warning"
                  onClick={() => trackOutcome(selectedNegotiation.id, 'declined_by_user', null)}
                >
                  ❌ I Declined Offer
                </button>
              </div>
            </div>
          )}

          {/* Completed Outcome */}
          {selectedNegotiation.negotiation_status === 'completed' && (
            <div className="section completed-section">
              <h3>✅ Negotiation Complete</h3>
              <div className="outcome-summary">
                <div><strong>Outcome:</strong> {selectedNegotiation.outcome_type?.replace(/_/g, ' ')}</div>
                {selectedNegotiation.final_accepted_amount && (
                  <div><strong>Final Amount:</strong> {formatCurrency(selectedNegotiation.final_accepted_amount)}</div>
                )}
                {selectedNegotiation.satisfaction_rating && (
                  <div><strong>Satisfaction:</strong> {selectedNegotiation.satisfaction_rating}/5 ⭐</div>
                )}
                {selectedNegotiation.outcome_notes && (
                  <div><strong>Notes:</strong> {selectedNegotiation.outcome_notes}</div>
                )}
                {selectedNegotiation.lessons_learned && (
                  <div><strong>Lessons Learned:</strong> {selectedNegotiation.lessons_learned}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Negotiations List */}
      {activeView === "list" && !selectedNegotiation && (
        <div className="negotiations-list">
          <h3>Your Negotiations</h3>
          {loading ? (
            <div className="loading">Loading negotiations...</div>
          ) : negotiations.length === 0 ? (
            <div className="empty-state">
              <p>No negotiations yet</p>
              <p>Click "Start New Negotiation" to create your first one!</p>
            </div>
          ) : (
            <div className="negotiations-grid">
              {negotiations.map((negotiation) => (
                <div 
                  key={negotiation.id}
                  className="negotiation-card"
                >
                  <div 
                    className="card-clickable"
                    onClick={() => {
                      setSelectedNegotiation(negotiation);
                      setActiveView("view");
                    }}
                  >
                    <div className="card-header">
                      <h4>{negotiation.company}</h4>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusBadge(negotiation.negotiation_status).color }}
                      >
                        {getStatusBadge(negotiation.negotiation_status).label}
                      </span>
                    </div>
                    <div className="card-role">{negotiation.role}</div>
                    <div className="card-details">
                      {negotiation.initial_offer_amount && (
                        <div>Initial: {formatCurrency(negotiation.initial_offer_amount)}</div>
                      )}
                      {negotiation.target_salary && (
                        <div>Target: {formatCurrency(negotiation.target_salary)}</div>
                      )}
                      {negotiation.final_accepted_amount && (
                        <div>Final: {formatCurrency(negotiation.final_accepted_amount)}</div>
                      )}
                    </div>
                    <div className="card-footer">
                      {new Date(negotiation.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    className="delete-btn-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNegotiation(negotiation.id);
                    }}
                    title="Delete this package"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resources View - Generic Educational Content */}
      {activeView === "resources" && (
        <div className="resources-view">
          <h2 className="resources-title">📚 Negotiation Resources & Frameworks</h2>
          <p className="resources-subtitle">Educational content to help you master salary negotiation</p>

          {/* Total Compensation Framework */}
          <div className="section total-comp-section">
            <h3>💼 Total Compensation Framework</h3>
            <p className="section-intro">Evaluate the complete package - not just base salary</p>
            <div className="comp-framework-grid">
              <div className="comp-item">
                <div className="comp-weight">40%</div>
                <h4>Base Salary</h4>
                <p>Compare to market median for your experience level</p>
              </div>
              <div className="comp-item">
                <div className="comp-weight">25%</div>
                <h4>Equity</h4>
                <p>Calculate potential value based on realistic exit scenarios</p>
              </div>
              <div className="comp-item">
                <div className="comp-weight">15%</div>
                <h4>Bonus</h4>
                <p>Ask about average bonus payout percentage historically</p>
              </div>
              <div className="comp-item">
                <div className="comp-weight">15%</div>
                <h4>Benefits</h4>
                <p>Compare total benefits value to your current package</p>
              </div>
              <div className="comp-item">
                <div className="comp-weight">5%</div>
                <h4>Perks</h4>
                <p>Nice to have but don't let them overshadow core compensation</p>
              </div>
            </div>
            <div className="comp-calculator">
              <strong>Total Compensation Formula:</strong>
              <div className="formula">
                Base Salary + (Equity Value ÷ Vesting Years) + Expected Bonus + Benefits Value = Total Annual Comp
              </div>
            </div>
          </div>

          {/* Counteroffer Evaluation */}
          <div className="section counteroffer-eval-section">
            <h3>✅ Counteroffer Evaluation Checklist</h3>
            <div className="eval-columns">
              <div className="eval-column">
                <h4>✅ Strong Counter Signals</h4>
                <ul>
                  <li>Backed by market research and data</li>
                  <li>References your specific experience</li>
                  <li>Shows enthusiasm for the role</li>
                  <li>Acknowledges their offer positively</li>
                  <li>Provides flexibility on components</li>
                </ul>
              </div>
              <div className="eval-column danger">
                <h4>🚩 Red Flags to Avoid</h4>
                <ul>
                  <li>Countering more than 30% above offer</li>
                  <li>Demanding instead of negotiating</li>
                  <li>Comparing to different role levels</li>
                  <li>Focusing only on personal needs</li>
                </ul>
              </div>
            </div>
            <div className="decision-framework">
              <h4>Decision Framework:</h4>
              <div className="decision-grid">
                <div className="decision-option accept">
                  <strong>Accept Initial:</strong> If offer is at/above market AND meets needs AND strong benefits
                </div>
                <div className="decision-option counter">
                  <strong>Counter:</strong> If 10-20% below market OR strong justification for higher comp
                </div>
                <div className="decision-option decline">
                  <strong>Decline:</strong> If significantly below market AND inflexible AND high opportunity cost
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Building Exercises */}
          <div className="section confidence-section">
            <h3>💪 Confidence Building Exercises</h3>
            <p className="section-intro">Boost your confidence before the negotiation</p>
            <div className="exercises-grid">
              <div className="exercise-card">
                <div className="exercise-icon">🦸</div>
                <h4>Power Posing</h4>
                <div className="exercise-duration">2 minutes before call</div>
                <p>Stand in a confident pose (hands on hips, chest out) to boost confidence hormones</p>
                <div className="exercise-benefit">Reduces cortisol, increases testosterone</div>
              </div>
              <div className="exercise-card">
                <div className="exercise-icon">🎤</div>
                <h4>Practice Script Aloud</h4>
                <div className="exercise-duration">10 minutes</div>
                <p>Say your key talking points out loud 3-5 times. Record yourself if possible.</p>
                <div className="exercise-benefit">Builds muscle memory, reduces nervousness</div>
              </div>
              <div className="exercise-card">
                <div className="exercise-icon">🧘</div>
                <h4>Visualize Success</h4>
                <div className="exercise-duration">5 minutes</div>
                <p>Close your eyes and imagine the conversation going well</p>
                <div className="exercise-benefit">Primes your brain for positive outcome</div>
              </div>
              <div className="exercise-card">
                <div className="exercise-icon">🎯</div>
                <h4>Know Your Walk-Away Number</h4>
                <div className="exercise-duration">Before negotiation</div>
                <p>Decide minimum acceptable offer beforehand</p>
                <div className="exercise-benefit">Gives you clarity and negotiating power</div>
              </div>
              <div className="exercise-card">
                <div className="exercise-icon">🔄</div>
                <h4>Reframe Rejection</h4>
                <div className="exercise-duration">Ongoing</div>
                <p>'No' to your counter doesn't mean no to you. They still want you!</p>
                <div className="exercise-benefit">Reduces fear of asking</div>
              </div>
            </div>
            <div className="mindset-section">
              <h4>Confidence Mindset:</h4>
              <ul className="mindset-list">
                <li>💼 You are not being greedy - you are being professional</li>
                <li>🤝 They expect you to negotiate - it's part of the process</li>
                <li>✅ The worst they can say is no - the offer won't disappear</li>
                <li>⭐ You bring unique value that justifies higher compensation</li>
                <li>💪 Confidence in negotiation signals confidence on the job</li>
              </ul>
            </div>
          </div>

          {/* General Negotiation Tips */}
          <div className="section tips-section">
            <h3>💡 General Negotiation Tips</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-icon">🤝</div>
                <h4>Always Negotiate</h4>
                <p>Companies expect it and respect candidates who advocate for themselves</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">📊</div>
                <h4>Lead with Data</h4>
                <p>Use market research and data to support your counter, not just personal needs</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">❤️</div>
                <h4>Show Enthusiasm</h4>
                <p>Make it clear you're excited about the role while discussing compensation</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">📝</div>
                <h4>Get It in Writing</h4>
                <p>Always get the final offer and all agreed terms documented</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">⏰</div>
                <h4>Take Your Time</h4>
                <p>Don't accept immediately - take 24-48 hours to review and decide</p>
              </div>
              <div className="tip-card">
                <div className="tip-icon">🔄</div>
                <h4>Be Flexible</h4>
                <p>If base salary is fixed, negotiate equity, bonus, or other benefits</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}