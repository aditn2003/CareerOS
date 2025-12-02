import React, { useEffect, useState } from "react";
import { getCompensationAnalytics, getOffers, getMarketComparison } from "../api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function CompensationAnalysis() {
  const [data, setData] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [marketComparison, setMarketComparison] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [analyticsRes, offersRes] = await Promise.all([
          getCompensationAnalytics(),
          getOffers()
        ]);
        setData(analyticsRes.data);
        setOffers(offersRes.data.offers || []);
      } catch (err) {
        console.error("Compensation analysis error:", err);
        setError("Failed to load compensation analysis data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMarketComparison = async (offerId) => {
    try {
      const res = await getMarketComparison(offerId);
      setMarketComparison(res.data);
      setSelectedOffer(offerId);
    } catch (err) {
      console.error("Error getting market comparison:", err);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading compensation analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { negotiationMetrics, offerStats, negotiationTrends, compensationEvolution, contextMetrics } = data;

  // Prepare chart data
  const offerStatusData = [
    { name: 'Accepted', value: offerStats.accepted, color: '#10b981' },
    { name: 'Pending', value: offerStats.pending, color: '#f59e0b' },
    { name: 'Rejected', value: offerStats.rejected, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const roleLevelData = Object.entries(offerStats.byRoleLevel || {})
    .map(([level, data]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      avgBase: data.avgBase,
      avgTotal: data.avgTotal,
      count: data.count
    }))
    .sort((a, b) => b.avgBase - a.avgBase);

  return (
    <div style={styles.container}>
      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard 
          title="Total Offers" 
          value={offerStats.totalOffers} 
          subtitle={`${offerStats.accepted} accepted, ${offerStats.pending} pending`}
          color="#3b82f6"
        />
        <SummaryCard 
          title="Avg Base Salary" 
          value={`$${offerStats.avgBaseSalary.toLocaleString()}`} 
          subtitle={`Avg Total Comp: $${offerStats.avgTotalComp.toLocaleString()}`}
          color="#10b981"
        />
        <SummaryCard 
          title="Negotiation Success" 
          value={`${negotiationMetrics.successRate.toFixed(1)}%`} 
          subtitle={`${negotiationMetrics.successfulNegotiations} of ${negotiationMetrics.totalNegotiations}`}
          color={negotiationMetrics.successRate >= 50 ? "#10b981" : "#f59e0b"}
        />
        <SummaryCard 
          title="Avg Improvement" 
          value={`${negotiationMetrics.avgImprovement.toFixed(1)}%`} 
          subtitle={`Max: ${negotiationMetrics.maxImprovement.toFixed(1)}%`}
          color="#8b5cf6"
        />
      </div>

      {/* Charts Grid */}
      <div style={styles.chartsGrid}>
        {/* Offer Status Distribution */}
        {offerStatusData.length > 0 && (
          <ChartCard title="Offer Status Distribution" icon="O">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={offerStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {offerStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Average Salary by Role Level */}
        {roleLevelData.length > 0 && (
          <ChartCard title="Average Salary by Role Level" icon="R">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roleLevelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="level" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="avgBase" fill="#3b82f6" name="Base Salary" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgTotal" fill="#10b981" name="Total Comp" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Negotiation Trends */}
        {negotiationTrends && negotiationTrends.length > 0 && (
          <ChartCard title="Negotiation Trends Over Time" icon="T">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={negotiationTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="avgImprovement" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  name="Avg Improvement %"
                />
                <Area 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  name="Success Rate %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Compensation Evolution */}
        {compensationEvolution && compensationEvolution.length > 0 && (
          <ChartCard title="Compensation Evolution" icon="E">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={compensationEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="start_date" 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickFormatter={(v) => new Date(v).getFullYear()}
                />
                <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="base_salary_start" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Base Salary"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_comp_start" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Total Comp"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Context-Based Negotiation Performance */}
        {contextMetrics && contextMetrics.length > 0 && (
          <ChartCard title="Negotiation Success by Context" icon="C">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={contextMetrics.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                <YAxis type="category" dataKey="context" stroke="#6b7280" fontSize={9} width={120} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="successRate" fill="#10b981" name="Success Rate %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Offers List with Market Comparison */}
      {offers.length > 0 && (
        <div style={styles.offersSection}>
          <h3 style={styles.sectionTitle}>Your Offers</h3>
          <div style={styles.offersList}>
            {offers.slice(0, 5).map(offer => (
              <div key={offer.id} style={styles.offerCard}>
                <div style={styles.offerHeader}>
                  <div>
                    <strong>{offer.company}</strong>
                    <div style={styles.offerRole}>{offer.role_title} ({offer.role_level})</div>
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
                  <div>Base: ${Number(offer.base_salary).toLocaleString()}</div>
                  <div>Total Comp: ${Number(offer.total_comp_year1).toLocaleString()}</div>
                  {offer.negotiation_improvement_percent > 0 && (
                    <div style={styles.negotiationBadge}>
                      ✨ Negotiated +{offer.negotiation_improvement_percent.toFixed(1)}%
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleMarketComparison(offer.id)}
                  style={styles.compareBtn}
                >
                  Compare to Market
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Comparison Modal */}
      {marketComparison && selectedOffer && (
        <div style={styles.modal} onClick={() => { setMarketComparison(null); setSelectedOffer(null); }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Market Comparison</h3>
            {marketComparison.benchmark ? (
              <>
                <div style={styles.comparisonCard}>
                  <div style={styles.comparisonRow}>
                    <span>Your Base Salary:</span>
                    <strong>${Number(marketComparison.offer.base_salary).toLocaleString()}</strong>
                  </div>
                  <div style={styles.comparisonRow}>
                    <span>Market Median:</span>
                    <strong>${Number(marketComparison.benchmark.percentile_50).toLocaleString()}</strong>
                  </div>
                  {marketComparison.comparison?.percentile && (
                    <div style={styles.comparisonRow}>
                      <span>Percentile:</span>
                      <strong>{marketComparison.comparison.percentile.toFixed(1)}th</strong>
                    </div>
                  )}
                </div>
                {marketComparison.comparison?.recommendation && (
                  <div style={{
                    ...styles.flagCard,
                    backgroundColor: marketComparison.comparison.flags.significantlyUnderpaid ? '#fef2f2' :
                                    marketComparison.comparison.flags.underpaid ? '#fffbeb' :
                                    marketComparison.comparison.flags.atMarket ? '#f0fdf4' : '#eff6ff'
                  }}>
                    <p><strong>{marketComparison.comparison.recommendation}</strong></p>
                  </div>
                )}
              </>
            ) : (
              <p>No benchmark data available for this role.</p>
            )}
            <button onClick={() => { setMarketComparison(null); setSelectedOffer(null); }} style={styles.closeBtn}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function SummaryCard({ title, value, subtitle, color }) {
  return (
    <div style={{ ...styles.summaryCard, borderTopColor: color }}>
      <div style={styles.summaryTitle}>{title}</div>
      <div style={{ ...styles.summaryValue, color }}>{value}</div>
      <div style={styles.summarySubtitle}>{subtitle}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartHeader}>
        <div style={styles.chartIcon}>{icon}</div>
        <h4 style={styles.chartTitle}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '0',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    color: '#6b7280',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '24px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '500',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderTop: '4px solid',
  },
  summaryTitle: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  summarySubtitle: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  chartIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  chartTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
  },
  offersSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
  },
  offersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  offerCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  offerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '12px',
  },
  offerRole: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
  },
  offerDetails: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '12px',
  },
  negotiationBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '8px',
  },
  compareBtn: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
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
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
  },
  comparisonCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  comparisonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  flagCard: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  closeBtn: {
    padding: '8px 16px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
  },
};

// Add keyframe animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

