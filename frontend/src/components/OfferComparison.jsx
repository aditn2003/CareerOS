import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  DollarSign,
  TrendingUp,
  MapPin,
  Calendar,
  Award,
  Building2,
  Briefcase,
  Heart,
  Target,
  Calculator,
  Archive,
  Plus,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import './OfferComparison.css';

const OfferComparison = () => {
  const [offers, setOffers] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [scenarioOffer, setScenarioOffer] = useState(null);
  const [scenarioChanges, setScenarioChanges] = useState({});
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [editingScores, setEditingScores] = useState(null);
  const [userScores, setUserScores] = useState({});
  const [editingFinancial, setEditingFinancial] = useState(null); // { offerId: { field: value } }
  const [tempFinancialValues, setTempFinancialValues] = useState({});

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      console.log('🔍 [FRONTEND] Fetching offers from /api/offer-comparison/compare');
      const response = await api.get('/api/offer-comparison/compare');
      console.log('✅ [FRONTEND] Received response:', {
        offersCount: response.data.offers?.length || 0,
        hasComparison: !!response.data.comparison,
        fullResponse: response.data
      });
      setOffers(response.data.offers || []);
      setComparison(response.data.comparison);
      setError(null);
    } catch (err) {
      console.error('❌ [FRONTEND] Error fetching offers:', err);
      console.error('❌ [FRONTEND] Full error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      setError(err.response?.data?.error || 'Failed to load offers');
      setOffers([]);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSelectOffer = (offerId) => {
    setSelectedOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleScenarioAnalysis = (offer) => {
    setScenarioOffer(offer);
    setScenarioChanges({
      base_salary: offer.base_salary,
      signing_bonus: offer.signing_bonus,
      annual_bonus_percent: offer.annual_bonus_percent,
      equity_value: offer.equity_value
    });
    setShowScenarioModal(true);
  };

  const runScenario = async () => {
    if (!scenarioOffer) return;
    
    try {
      const response = await api.post('/api/offer-comparison/scenario', {
        offerId: scenarioOffer.id,
        changes: scenarioChanges
      });
      
      // Show results in modal or update UI
      alert(`Scenario Results:\n\nYear 1: ${formatCurrency(response.data.modified.compensation.year1)} (${response.data.improvement.year1Percent > 0 ? '+' : ''}${response.data.improvement.year1Percent.toFixed(1)}%)\nYear 4: ${formatCurrency(response.data.modified.compensation.year4)} (${response.data.improvement.year4Percent > 0 ? '+' : ''}${response.data.improvement.year4Percent.toFixed(1)}%)`);
      setShowScenarioModal(false);
    } catch (err) {
      console.error('Error running scenario:', err);
      alert('Failed to run scenario analysis');
    }
  };

  const handleArchiveOffer = async (offerId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a reason for archiving this offer:');
      if (!reason) return;
    }
    
    try {
      await api.put(`/api/offer-comparison/${offerId}/archive`, { reason });
      fetchOffers();
      alert('Offer archived successfully');
    } catch (err) {
      console.error('Error archiving offer:', err);
      alert('Failed to archive offer');
    }
  };

  const handleUpdateScores = async (offerId, scores) => {
    try {
      await api.put(`/api/offer-comparison/${offerId}/scores`, { scores });
      fetchOffers();
      setEditingScores(null);
    } catch (err) {
      console.error('Error updating scores:', err);
      alert('Failed to update scores');
    }
  };

  const handleEditFinancial = (offerId, field, currentValue) => {
    setEditingFinancial({ offerId, field });
    setTempFinancialValues({
      ...tempFinancialValues,
      [`${offerId}_${field}`]: currentValue
    });
  };

  const handleSaveFinancial = async (offerId, field) => {
    try {
      const value = tempFinancialValues[`${offerId}_${field}`];
      if (value === undefined || value === null || value === '') {
        setEditingFinancial(null);
        return;
      }

      // Map frontend field names to backend field names
      const fieldMap = {
        'base_salary': 'base_salary',
        'signing_bonus': 'signing_bonus',
        'annual_bonus': 'annual_bonus_percent',
        'equity': 'equity_value',
        'benefits': 'other_benefits_value'
      };

      const backendField = fieldMap[field] || field;
      const numValue = parseFloat(value);
      
      if (isNaN(numValue) || numValue < 0) {
        alert('Please enter a valid number');
        return;
      }

      const updateData = { [backendField]: numValue };

      await api.put(`/api/offer-comparison/${offerId}/financial`, updateData);
      await fetchOffers(); // Refresh to get updated compensation calculations
      setEditingFinancial(null);
      setTempFinancialValues({});
    } catch (err) {
      console.error('Error updating financial value:', err);
      alert('Failed to update financial value: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelEditFinancial = () => {
    setEditingFinancial(null);
    setTempFinancialValues({});
  };


  if (loading) {
    return <div className="offer-comparison-loading">Loading offers...</div>;
  }

  if (error) {
    return <div className="offer-comparison-error">{error}</div>;
  }

  const displayOffers = selectedOffers.length > 0
    ? offers.filter(o => selectedOffers.includes(o.id))
    : offers.slice(0, 3); // Show top 3 by default

  return (
    <div className="offer-comparison">
      <div className="offer-comparison-header">
        <h1>
          <Target size={24} />
          Offer Comparison
        </h1>
        <button className="btn-add-offer" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Add Offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} />
          <p>No offers to compare yet. Add your first offer to get started!</p>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            Add Your First Offer
          </button>
        </div>
      ) : (
        <>
          {/* Comparison Matrix */}
          <div className="comparison-matrix">
            <div className="matrix-header">
              <h2>Side-by-Side Comparison</h2>
              <div className="offer-selector">
                {offers.map(offer => (
                  <label key={offer.id} className="offer-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOffers.includes(offer.id)}
                      onChange={() => handleSelectOffer(offer.id)}
                    />
                    {offer.company}
                  </label>
                ))}
              </div>
            </div>

            <div className="matrix-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {displayOffers.map(offer => (
                      <th key={offer.id}>
                        <div className="offer-header">
                          <strong>{offer.company}</strong>
                          <span className="offer-role">{offer.role_title}</span>
                          <div className="offer-score">
                            Score: {offer.weightedScore?.totalScore.toFixed(1)}/10
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Financial Metrics */}
                  <tr className="section-header">
                    <td colSpan={displayOffers.length + 1}>
                      <DollarSign size={16} />
                      Financial Compensation
                    </td>
                  </tr>
                  <tr>
                    <td>Base Salary</td>
                    {displayOffers.map(offer => {
                      const isEditing = editingFinancial?.offerId === offer.id && editingFinancial?.field === 'base_salary';
                      return (
                        <td key={offer.id} className="editable-cell">
                          {isEditing ? (
                            <div className="edit-input-group">
                              <input
                                type="number"
                                value={tempFinancialValues[`${offer.id}_base_salary`] ?? offer.base_salary ?? 0}
                                onChange={(e) => setTempFinancialValues({
                                  ...tempFinancialValues,
                                  [`${offer.id}_base_salary`]: e.target.value
                                })}
                                className="edit-input"
                                autoFocus
                              />
                              <button
                                className="save-btn"
                                onClick={() => handleSaveFinancial(offer.id, 'base_salary')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={handleCancelEditFinancial}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="editable-value">
                              {formatCurrency(offer.compensation.base)}
                              <button
                                className="edit-icon-btn"
                                onClick={() => handleEditFinancial(offer.id, 'base_salary', offer.base_salary || offer.compensation.base)}
                                title="Edit Base Salary"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Signing Bonus</td>
                    {displayOffers.map(offer => {
                      const isEditing = editingFinancial?.offerId === offer.id && editingFinancial?.field === 'signing_bonus';
                      return (
                        <td key={offer.id} className="editable-cell">
                          {isEditing ? (
                            <div className="edit-input-group">
                              <input
                                type="number"
                                value={tempFinancialValues[`${offer.id}_signing_bonus`] ?? offer.signing_bonus ?? 0}
                                onChange={(e) => setTempFinancialValues({
                                  ...tempFinancialValues,
                                  [`${offer.id}_signing_bonus`]: e.target.value
                                })}
                                className="edit-input"
                                autoFocus
                              />
                              <button
                                className="save-btn"
                                onClick={() => handleSaveFinancial(offer.id, 'signing_bonus')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={handleCancelEditFinancial}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="editable-value">
                              {formatCurrency(offer.compensation.signing)}
                              <button
                                className="edit-icon-btn"
                                onClick={() => handleEditFinancial(offer.id, 'signing_bonus', offer.signing_bonus || offer.compensation.signing)}
                                title="Edit Signing Bonus"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Annual Bonus</td>
                    {displayOffers.map(offer => {
                      const isEditing = editingFinancial?.offerId === offer.id && editingFinancial?.field === 'annual_bonus';
                      const bonusPercent = offer.annual_bonus_percent || 0;
                      return (
                        <td key={offer.id} className="editable-cell">
                          {isEditing ? (
                            <div className="edit-input-group">
                              <input
                                type="number"
                                step="0.1"
                                value={tempFinancialValues[`${offer.id}_annual_bonus`] ?? bonusPercent}
                                onChange={(e) => setTempFinancialValues({
                                  ...tempFinancialValues,
                                  [`${offer.id}_annual_bonus`]: e.target.value
                                })}
                                className="edit-input"
                                autoFocus
                              />
                              <span className="input-suffix">%</span>
                              <button
                                className="save-btn"
                                onClick={() => handleSaveFinancial(offer.id, 'annual_bonus')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={handleCancelEditFinancial}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="editable-value">
                              {formatCurrency(offer.compensation.bonus)}
                              <button
                                className="edit-icon-btn"
                                onClick={() => handleEditFinancial(offer.id, 'annual_bonus', bonusPercent)}
                                title="Edit Annual Bonus %"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Equity (Year 1)</td>
                    {displayOffers.map(offer => {
                      const isEditing = editingFinancial?.offerId === offer.id && editingFinancial?.field === 'equity';
                      const equityValue = offer.equity_value || 0;
                      return (
                        <td key={offer.id} className="editable-cell">
                          {isEditing ? (
                            <div className="edit-input-group">
                              <input
                                type="number"
                                value={tempFinancialValues[`${offer.id}_equity`] ?? equityValue}
                                onChange={(e) => setTempFinancialValues({
                                  ...tempFinancialValues,
                                  [`${offer.id}_equity`]: e.target.value
                                })}
                                className="edit-input"
                                autoFocus
                              />
                              <button
                                className="save-btn"
                                onClick={() => handleSaveFinancial(offer.id, 'equity')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={handleCancelEditFinancial}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="editable-value">
                              {formatCurrency(offer.compensation.equity / 4)}
                              <button
                                className="edit-icon-btn"
                                onClick={() => handleEditFinancial(offer.id, 'equity', equityValue)}
                                title="Edit Total Equity Value"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td>Benefits Value</td>
                    {displayOffers.map(offer => {
                      const isEditing = editingFinancial?.offerId === offer.id && editingFinancial?.field === 'benefits';
                      return (
                        <td key={offer.id} className="editable-cell">
                          {isEditing ? (
                            <div className="edit-input-group">
                              <input
                                type="number"
                                value={tempFinancialValues[`${offer.id}_benefits`] ?? offer.other_benefits_value ?? 0}
                                onChange={(e) => setTempFinancialValues({
                                  ...tempFinancialValues,
                                  [`${offer.id}_benefits`]: e.target.value
                                })}
                                className="edit-input"
                                autoFocus
                              />
                              <button
                                className="save-btn"
                                onClick={() => handleSaveFinancial(offer.id, 'benefits')}
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="cancel-btn"
                                onClick={handleCancelEditFinancial}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="editable-value">
                              {formatCurrency(offer.compensation.benefits)}
                              <button
                                className="edit-icon-btn"
                                onClick={() => handleEditFinancial(offer.id, 'benefits', offer.other_benefits_value || 0)}
                                title="Edit Benefits Value"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="highlight-row">
                    <td><strong>Total Comp (Year 1)</strong></td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        <strong>{formatCurrency(offer.compensation.year1)}</strong>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Total Comp (4 Years)</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>{formatCurrency(offer.compensation.year4)}</td>
                    ))}
                  </tr>
                  
                  {/* Cost of Living Adjustment */}
                  <tr className="section-header">
                    <td colSpan={displayOffers.length + 1}>
                      <MapPin size={16} />
                      Cost of Living Adjustment
                    </td>
                  </tr>
                  <tr>
                    <td>Location</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>{offer.location || 'N/A'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>COL Index</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>{offer.colIndex.toFixed(1)}</td>
                    ))}
                  </tr>
                  <tr className="highlight-row">
                    <td><strong>Adjusted Comp (Year 1)</strong></td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        <strong>{formatCurrency(offer.adjustedCompensation.adjustedYear1)}</strong>
                        <span className="adjustment-note">
                          ({offer.adjustedCompensation.adjustmentFactor > 1 ? '+' : ''}
                          {((offer.adjustedCompensation.adjustmentFactor - 1) * 100).toFixed(1)}%)
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Non-Financial Factors */}
                  <tr className="section-header">
                    <td colSpan={displayOffers.length + 1}>
                      <Heart size={16} />
                      Non-Financial Factors
                      <span style={{ marginLeft: '1rem', fontSize: '0.8125rem', fontWeight: 'normal', color: '#64748b' }}>
                        (Auto-calculated from offer data)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Culture Fit
                      {displayOffers.some(o => o.scoreSource === 'ai') && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                          🤖 AI
                        </span>
                      )}
                    </td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        {editingScores === offer.id ? (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={userScores[offer.id]?.cultureFit || offer.nonFinancialScore.cultureFit}
                            onChange={(e) => setUserScores({
                              ...userScores,
                              [offer.id]: {
                                ...userScores[offer.id],
                                cultureFit: parseInt(e.target.value)
                              }
                            })}
                          />
                        ) : (
                          <span className="score-badge">{offer.nonFinancialScore.cultureFit}/10</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Growth Opportunities</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        {editingScores === offer.id ? (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={userScores[offer.id]?.growthOpportunities || offer.nonFinancialScore.growthOpportunities}
                            onChange={(e) => setUserScores({
                              ...userScores,
                              [offer.id]: {
                                ...userScores[offer.id],
                                growthOpportunities: parseInt(e.target.value)
                              }
                            })}
                          />
                        ) : (
                          <span className="score-badge">{offer.nonFinancialScore.growthOpportunities}/10</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Work-Life Balance</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        {editingScores === offer.id ? (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={userScores[offer.id]?.workLifeBalance || offer.nonFinancialScore.workLifeBalance}
                            onChange={(e) => setUserScores({
                              ...userScores,
                              [offer.id]: {
                                ...userScores[offer.id],
                                workLifeBalance: parseInt(e.target.value)
                              }
                            })}
                          />
                        ) : (
                          <span className="score-badge">{offer.nonFinancialScore.workLifeBalance}/10</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Remote Flexibility</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        {editingScores === offer.id ? (
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={userScores[offer.id]?.remoteFlexibility || offer.nonFinancialScore.remoteFlexibility}
                            onChange={(e) => setUserScores({
                              ...userScores,
                              [offer.id]: {
                                ...userScores[offer.id],
                                remoteFlexibility: parseInt(e.target.value)
                              }
                            })}
                          />
                        ) : (
                          <span className="score-badge">{offer.nonFinancialScore.remoteFlexibility}/10</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="highlight-row">
                    <td><strong>Overall Non-Financial Score</strong></td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>
                        <strong>{offer.nonFinancialScore.overallScore.toFixed(1)}/10</strong>
                      </td>
                    ))}
                  </tr>

                  {/* Weighted Scores */}
                  <tr className="section-header">
                    <td colSpan={displayOffers.length + 1}>
                      <TrendingUp size={16} />
                      Weighted Scores
                    </td>
                  </tr>
                  <tr>
                    <td>Financial Score</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>{offer.weightedScore?.financialScore.toFixed(1)}/10</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Non-Financial Score</td>
                    {displayOffers.map(offer => (
                      <td key={offer.id}>{offer.weightedScore?.nonFinancialScore.toFixed(1)}/10</td>
                    ))}
                  </tr>
                  <tr className="highlight-row winner-row">
                    <td><strong>Total Weighted Score</strong></td>
                    {displayOffers.map((offer, idx) => (
                      <td key={offer.id}>
                        <strong className="winner-badge">
                          {offer.weightedScore?.totalScore.toFixed(1)}/10
                          {idx === 0 && offer.weightedScore?.totalScore >= Math.max(...displayOffers.map(o => o.weightedScore?.totalScore || 0)) && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '1.25rem' }}>🏆</span>
                          )}
                        </strong>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Negotiation Recommendations */}
          <div className="negotiation-section">
            <h2>
              <AlertCircle size={20} />
              Negotiation Recommendations
            </h2>
            <div className="recommendations-grid">
              {displayOffers.map(offer => (
                <div key={offer.id} className="recommendation-card">
                  <h3>{offer.company}</h3>
                  {offer.negotiationRecommendations?.length > 0 ? (
                    <ul>
                      {offer.negotiationRecommendations.map((rec, idx) => {
                        // Determine recommendation type for styling
                        const recType = rec.title?.toLowerCase().includes('pto') ? 'pto' :
                                       rec.title?.toLowerCase().includes('competing') || rec.title?.toLowerCase().includes('leverage') ? 'competing-offer' :
                                       rec.title?.toLowerCase().includes('retirement') || rec.title?.toLowerCase().includes('401k') ? 'retirement' : '';
                        
                        return (
                          <li key={idx} className={`priority-${rec.priority || 'medium'}`} data-type={recType}>
                            <strong>{rec.title}:</strong>
                            <p>{rec.message}</p>
                            {rec.suggestedAction && (
                              <div className="suggested-action">
                                <button onClick={() => {
                                  // You can add action handling here if needed
                                  console.log('Action clicked:', rec.suggestedAction);
                                }}>
                                  {rec.suggestedAction}
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <p className="no-recommendations">No specific recommendations at this time.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {displayOffers.map(offer => (
              <div key={offer.id} className="offer-actions">
                <h3>{offer.company}</h3>
                <button
                  className="btn-scenario"
                  onClick={() => handleScenarioAnalysis(offer)}
                >
                  <Calculator size={16} />
                  Scenario Analysis
                </button>
                <button
                  className="btn-edit-scores"
                  onClick={() => {
                    if (editingScores === offer.id) {
                      // Save: ensure all 4 scores are included
                      const scoresToSave = {
                        cultureFit: userScores[offer.id]?.cultureFit ?? offer.nonFinancialScore.cultureFit,
                        growthOpportunities: userScores[offer.id]?.growthOpportunities ?? offer.nonFinancialScore.growthOpportunities,
                        workLifeBalance: userScores[offer.id]?.workLifeBalance ?? offer.nonFinancialScore.workLifeBalance,
                        remoteFlexibility: userScores[offer.id]?.remoteFlexibility ?? offer.nonFinancialScore.remoteFlexibility
                      };
                      handleUpdateScores(offer.id, scoresToSave);
                    } else {
                      // Enter edit mode: initialize with current values
                      setEditingScores(offer.id);
                      setUserScores({
                        ...userScores,
                        [offer.id]: {
                          cultureFit: offer.nonFinancialScore.cultureFit,
                          growthOpportunities: offer.nonFinancialScore.growthOpportunities,
                          workLifeBalance: offer.nonFinancialScore.workLifeBalance,
                          remoteFlexibility: offer.nonFinancialScore.remoteFlexibility
                        }
                      });
                    }
                  }}
                >
                  <Edit size={16} />
                  {editingScores === offer.id ? 'Save Scores' : 'Edit Scores'}
                </button>
                <button
                  className="btn-archive"
                  onClick={() => handleArchiveOffer(offer.id)}
                >
                  <Archive size={16} />
                  Archive
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Scenario Analysis Modal */}
      {showScenarioModal && scenarioOffer && (
        <div className="modal-overlay" onClick={() => setShowScenarioModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Scenario Analysis: {scenarioOffer.company}</h2>
              <button className="modal-close" onClick={() => setShowScenarioModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="scenario-form">
              <label>
                Base Salary:
                <input
                  type="number"
                  value={scenarioChanges.base_salary || ''}
                  onChange={(e) => setScenarioChanges({
                    ...scenarioChanges,
                    base_salary: parseFloat(e.target.value)
                  })}
                />
              </label>
              <label>
                Signing Bonus:
                <input
                  type="number"
                  value={scenarioChanges.signing_bonus || ''}
                  onChange={(e) => setScenarioChanges({
                    ...scenarioChanges,
                    signing_bonus: parseFloat(e.target.value)
                  })}
                />
              </label>
              <label>
                Annual Bonus %:
                <input
                  type="number"
                  step="0.1"
                  value={scenarioChanges.annual_bonus_percent || ''}
                  onChange={(e) => setScenarioChanges({
                    ...scenarioChanges,
                    annual_bonus_percent: parseFloat(e.target.value)
                  })}
                />
              </label>
              <label>
                Equity Value:
                <input
                  type="number"
                  value={scenarioChanges.equity_value || ''}
                  onChange={(e) => setScenarioChanges({
                    ...scenarioChanges,
                    equity_value: parseFloat(e.target.value)
                  })}
                />
              </label>
              <button className="btn-primary" onClick={runScenario}>
                Calculate Scenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferComparison;

