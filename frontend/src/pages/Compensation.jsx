import React, { useState, useEffect } from "react";
import { 
  getOffers, deleteOffer, acceptOffer, recordNegotiation,
  getCompensationAnalytics, getMarketComparison
} from "../api";
import OfferForm from "../components/OfferForm";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function Compensation() {
  const [offers, setOffers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [marketComparison, setMarketComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [offersRes, analyticsRes] = await Promise.all([
        getOffers(),
        getCompensationAnalytics()
      ]);
      setOffers(offersRes.data.offers || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await deleteOffer(id);
      loadData();
    } catch (err) {
      console.error("Error deleting offer:", err);
      alert("Failed to delete offer");
    }
  };

  const handleAccept = async (id) => {
    if (!window.confirm("Accept this offer? This will create a compensation history entry.")) return;
    try {
      await acceptOffer(id);
      loadData();
      alert("Offer accepted! Compensation history entry created.");
    } catch (err) {
      console.error("Error accepting offer:", err);
      alert("Failed to accept offer");
    }
  };

  const handleNegotiate = async (offerId, negotiationData) => {
    try {
      await recordNegotiation(offerId, negotiationData);
      loadData();
      alert("Negotiation recorded!");
    } catch (err) {
      console.error("Error recording negotiation:", err);
      alert("Failed to record negotiation");
    }
  };

  const handleMarketComparison = async (offerId) => {
    try {
      const res = await getMarketComparison(offerId);
      setMarketComparison(res.data);
      setSelectedOffer(offerId);
    } catch (err) {
      console.error("Error getting market comparison:", err);
      alert("Failed to get market comparison");
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading compensation data...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>💼 Compensation & Offers</h1>

      {showForm ? (
        <OfferForm
          offer={editingOffer}
          onSave={() => {
            setShowForm(false);
            setEditingOffer(null);
            loadData();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingOffer(null);
          }}
        />
      ) : (
        <>
          <div style={styles.header}>
            <button onClick={() => setShowForm(true)} style={styles.addBtn}>
              ➕ Add New Offer
            </button>
          </div>

          {/* Summary Cards */}
          {analytics && (
            <div style={styles.summaryGrid}>
              <div style={styles.card}>
                <div style={styles.cardTitle}>Total Offers</div>
                <div style={styles.cardValue}>{analytics.offerStats.totalOffers}</div>
                <div style={styles.cardSubtitle}>
                  {analytics.offerStats.accepted} accepted, {analytics.offerStats.pending} pending
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>Avg Base Salary</div>
                <div style={styles.cardValue}>
                  ${analytics.offerStats.avgBaseSalary.toLocaleString()}
                </div>
                <div style={styles.cardSubtitle}>
                  Avg Total Comp: ${analytics.offerStats.avgTotalComp.toLocaleString()}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>Negotiation Success</div>
                <div style={styles.cardValue}>
                  {analytics.negotiationMetrics.successRate.toFixed(1)}%
                </div>
                <div style={styles.cardSubtitle}>
                  {analytics.negotiationMetrics.successfulNegotiations} of {analytics.negotiationMetrics.totalNegotiations}
                </div>
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}>Avg Improvement</div>
                <div style={styles.cardValue}>
                  {analytics.negotiationMetrics.avgImprovement.toFixed(1)}%
                </div>
                <div style={styles.cardSubtitle}>
                  Max: {analytics.negotiationMetrics.maxImprovement.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Offers List */}
          <div style={styles.offersSection}>
            <h2>Your Offers</h2>
            {offers.length === 0 ? (
              <p style={styles.empty}>No offers yet. Add your first offer to get started!</p>
            ) : (
              <div style={styles.offersGrid}>
                {offers.map(offer => (
                  <div key={offer.id} style={styles.offerCard}>
                    <div style={styles.offerHeader}>
                      <div>
                        <h3>{offer.company}</h3>
                        <p style={styles.offerRole}>{offer.role_title} ({offer.role_level})</p>
                      </div>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: offer.offer_status === 'accepted' ? '#10b981' :
                                        offer.offer_status === 'rejected' ? '#ef4444' :
                                        offer.offer_status === 'pending' ? '#f59e0b' : '#6b7280'
                      }}>
                        {offer.offer_status}
                      </span>
                    </div>
                    
                    <div style={styles.offerDetails}>
                      <div style={styles.detailRow}>
                        <strong>Base Salary:</strong> ${Number(offer.base_salary).toLocaleString()}
                      </div>
                      <div style={styles.detailRow}>
                        <strong>Total Comp (Year 1):</strong> ${Number(offer.total_comp_year1).toLocaleString()}
                      </div>
                      {offer.negotiation_improvement_percent > 0 && (
                        <div style={styles.negotiationBadge}>
                          ✨ Negotiated +{offer.negotiation_improvement_percent.toFixed(1)}%
                        </div>
                      )}
                      <div style={styles.detailRow}>
                        <strong>Location:</strong> {offer.location} ({offer.location_type})
                      </div>
                      <div style={styles.detailRow}>
                        <strong>Offer Date:</strong> {new Date(offer.offer_date).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={styles.offerActions}>
                      <button 
                        onClick={() => {
                          setEditingOffer(offer);
                          setShowForm(true);
                        }}
                        style={styles.actionBtn}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleMarketComparison(offer.id)}
                        style={styles.actionBtn}
                      >
                        Market Compare
                      </button>
                      {offer.offer_status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleAccept(offer.id)}
                            style={{...styles.actionBtn, backgroundColor: '#10b981'}}
                          >
                            Accept
                          </button>
                          <NegotiationModal 
                            offer={offer} 
                            onNegotiate={handleNegotiate}
                          />
                        </>
                      )}
                      <button 
                        onClick={() => handleDelete(offer.id)}
                        style={{...styles.actionBtn, backgroundColor: '#ef4444'}}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analytics Charts */}
          {analytics && analytics.negotiationTrends.length > 0 && (
            <div style={styles.chartsSection}>
              <h2>Negotiation Trends</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.negotiationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgImprovement" stroke="#3b82f6" name="Avg Improvement %" />
                  <Line type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Market Comparison Modal */}
          {marketComparison && selectedOffer && (
            <MarketComparisonModal
              comparison={marketComparison}
              onClose={() => {
                setMarketComparison(null);
                setSelectedOffer(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

// Negotiation Modal Component
function NegotiationModal({ offer, onNegotiate }) {
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    negotiated_base_salary: offer.base_salary,
    negotiation_notes: "",
    negotiation_type: "base_salary",
    outcome: "pending"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const improvement = ((formData.negotiated_base_salary - offer.initial_base_salary) / offer.initial_base_salary) * 100;
    onNegotiate(offer.id, {
      ...formData,
      value_before: offer.initial_base_salary || offer.base_salary,
      value_after: formData.negotiated_base_salary,
      improvement_percent: improvement
    });
    setShow(false);
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={styles.actionBtn}>
        Negotiate
      </button>
    );
  }

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3>Record Negotiation</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Negotiated Base Salary:
            <input
              type="number"
              value={formData.negotiated_base_salary}
              onChange={(e) => setFormData({...formData, negotiated_base_salary: parseFloat(e.target.value)})}
              required
              style={styles.input}
            />
          </label>
          <label>
            Notes:
            <textarea
              value={formData.negotiation_notes}
              onChange={(e) => setFormData({...formData, negotiation_notes: e.target.value})}
              style={styles.textarea}
            />
          </label>
          <div style={styles.modalActions}>
            <button type="submit" style={styles.submitBtn}>Record</button>
            <button type="button" onClick={() => setShow(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Market Comparison Modal
function MarketComparisonModal({ comparison, onClose }) {
  if (!comparison.benchmark && !comparison.approximation) {
    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <h3>Market Comparison</h3>
          <p>No benchmark data available for this role.</p>
          <button onClick={onClose} style={styles.cancelBtn}>Close</button>
        </div>
      </div>
    );
  }

  const benchmark = comparison.benchmark || comparison.approximation;
  const percentile = comparison.comparison?.percentile;

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3>Market Comparison</h3>
        {comparison.benchmark ? (
          <>
            <div style={styles.comparisonCard}>
              <div style={styles.comparisonRow}>
                <span>Your Base Salary:</span>
                <strong>${Number(comparison.offer.base_salary).toLocaleString()}</strong>
              </div>
              <div style={styles.comparisonRow}>
                <span>Market Median:</span>
                <strong>${Number(benchmark.percentile_50 || benchmark.estimatedMedian).toLocaleString()}</strong>
              </div>
              {percentile && (
                <div style={styles.comparisonRow}>
                  <span>Percentile:</span>
                  <strong>{percentile.toFixed(1)}th</strong>
                </div>
              )}
            </div>
            {comparison.comparison?.flags && (
              <div style={{
                ...styles.flagCard,
                backgroundColor: comparison.comparison.flags.significantlyUnderpaid ? '#fef2f2' :
                                comparison.comparison.flags.underpaid ? '#fffbeb' :
                                comparison.comparison.flags.atMarket ? '#f0fdf4' : '#eff6ff'
              }}>
                <p><strong>{comparison.comparison.recommendation}</strong></p>
              </div>
            )}
          </>
        ) : (
          <div>
            <p>Estimated market data (low confidence):</p>
            <p>Estimated Median: ${Number(benchmark.estimatedMedian).toLocaleString()}</p>
          </div>
        )}
        <button onClick={onClose} style={styles.cancelBtn}>Close</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px'
  },
  header: {
    marginBottom: '20px'
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  offersSection: {
    marginBottom: '30px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  offersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  offerCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  offerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '16px'
  },
  offerRole: {
    color: '#6b7280',
    fontSize: '14px',
    marginTop: '4px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  offerDetails: {
    marginBottom: '16px'
  },
  detailRow: {
    marginBottom: '8px',
    fontSize: '14px'
  },
  negotiationBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '8px'
  },
  offerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionBtn: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  chartsSection: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%'
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  textarea: {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minHeight: '80px'
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  submitBtn: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  comparisonCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  comparisonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  flagCard: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px'
  }
};

