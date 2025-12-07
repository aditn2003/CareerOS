import React, { useState, useEffect } from "react";
import { getComprehensiveCompensationAnalytics, recalculateCompetingOffers, getOffers, autoFetchBenchmarkForOffer, acceptOffer, createCompensationHistory, deleteCompensationHistory } from "../api";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#14b8a6', '#6366f1', '#0ea5e9'];

// Tab Panel Component
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, subtitle, color = '#8b5cf6' }) {
  return (
    <Box className="statistics-card" sx={{ height: '100%', borderTop: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      <Box className="statistics-card-content">
        <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color, mt: 1.5, mb: 0.5, fontSize: '2rem' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#e2e8f0', mt: 0.5, fontSize: '0.875rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }) {
  const colorMap = {
    warning: '#f59e0b',
    info: '#8b5cf6',
    success: '#10b981',
    error: '#ef4444'
  };
  
  // Get background color based on type - darker for better contrast
  const getBackgroundColor = (type) => {
    switch(type) {
      case 'warning': return 'linear-gradient(135deg, rgba(245, 158, 11, 0.85) 0%, rgba(217, 119, 6, 0.9) 100%)';
      case 'info': return 'linear-gradient(135deg, rgba(139, 92, 246, 0.85) 0%, rgba(124, 58, 237, 0.9) 100%)';
      case 'success': return 'linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(5, 150, 105, 0.9) 100%)';
      case 'error': return 'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.9) 100%)';
      default: return 'linear-gradient(135deg, rgba(139, 92, 246, 0.85) 0%, rgba(124, 58, 237, 0.9) 100%)';
    }
  };
  
  // Get text color - ensure high contrast
  const getTextColor = (type) => {
    // White text for all types since backgrounds are now darker
    return '#ffffff';
  };
  
  return (
    <Box className="statistics-card" sx={{ 
      mb: 2, 
      borderLeft: `4px solid ${colorMap[recommendation.type] || '#8b5cf6'}`,
      background: getBackgroundColor(recommendation.type),
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}>
      <Box className="statistics-card-content">
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: getTextColor(recommendation.type), fontSize: '1.1rem', textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
            {recommendation.title}
          </Typography>
          <Chip 
            label={recommendation.priority} 
            size="small" 
            sx={{
              bgcolor: recommendation.priority === 'high' ? 'rgba(239, 68, 68, 0.6)' : recommendation.priority === 'medium' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(139, 92, 246, 0.6)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: '22px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: getTextColor(recommendation.type), mb: 1.5, lineHeight: 1.7, fontSize: '0.95rem', fontWeight: 400, textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
          {recommendation.message}
        </Typography>
        <Typography variant="caption" sx={{ color: '#ffffff', fontStyle: 'italic', fontSize: '0.85rem', fontWeight: 500, display: 'block', mt: 1, opacity: 0.95, textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
          {recommendation.action}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ComprehensiveCompensationAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [fetchingBenchmarks, setFetchingBenchmarks] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState({ current: 0, total: 0 });
  const [offers, setOffers] = useState([]);
  const [showOffersList, setShowOffersList] = useState(false);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [newRoleData, setNewRoleData] = useState({
    company: '',
    role_title: '',
    role_level: '',
    start_date: '',
    end_date: '',
    base_salary_start: '',
    total_comp_start: '',
    base_salary_current: '',
    total_comp_current: '',
    pto_days: '',
    benefits_value: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getComprehensiveCompensationAnalytics();
      console.log("Comprehensive compensation analytics response:", res.data);
      console.log("📊 Offer Tracking from API:", {
        totalOffers: res.data?.offerTracking?.totalOffers,
        byLevel: res.data?.offerTracking?.byLevel,
        byRole: Object.keys(res.data?.offerTracking?.byRole || {}),
        byLocation: Object.keys(res.data?.offerTracking?.byLocation || {}),
        byCompany: Object.keys(res.data?.offerTracking?.byCompany || {})
      });
      
      // Validate response data
      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }
      
      setData(res.data);
      
      // Also fetch individual offers for detailed display
      try {
        const offersRes = await getOffers();
        const allOffers = offersRes.data.offers || [];
        // Filter out offers linked to archived jobs (if needed)
        setOffers(allOffers);
      } catch (offersErr) {
        console.error("Error fetching offers:", offersErr);
        // Don't fail the whole load if offers fetch fails
      }
    } catch (err) {
      console.error("Comprehensive compensation analysis error:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to load comprehensive compensation analytics";
      setError(errorMessage);
      setData(null); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBenchmarks = async () => {
    try {
      setFetchingBenchmarks(true);
      setBenchmarkProgress({ current: 0, total: 0 });
      
      // Get all offers
      const offersRes = await getOffers();
      const allOffers = offersRes.data.offers || [];
      
      if (allOffers.length === 0) {
        alert("No offers found. Please create offers first to fetch market benchmarks.");
        setFetchingBenchmarks(false);
        return;
      }

      // Filter offers that have minimum required fields for benchmark fetching
      // We need at least role_title, role_level, and location
      const validOffers = allOffers.filter(offer => 
        offer.role_title && 
        offer.role_level && 
        offer.location
      );

      // Identify which offers are missing fields
      const invalidOffers = allOffers.filter(offer => 
        !offer.role_title || 
        !offer.role_level || 
        !offer.location
      ).map(offer => {
        const missingFields = [];
        if (!offer.role_title) missingFields.push('Role Title');
        if (!offer.role_level) missingFields.push('Role Level');
        if (!offer.location) missingFields.push('Location');
        return {
          company: offer.company || 'Unknown',
          role: offer.role_title || 'N/A',
          missingFields: missingFields.join(', ')
        };
      });

      if (validOffers.length === 0) {
        let message = `No valid offers found for benchmark fetching.\n\n`;
        message += `Offers need the following fields:\n`;
        message += `• Role Title\n`;
        message += `• Role Level\n`;
        message += `• Location\n\n`;
        message += `Total offers: ${allOffers.length}\n`;
        message += `Valid offers: ${validOffers.length}\n\n`;
        if (invalidOffers.length > 0) {
          message += `Offers missing fields:\n`;
          invalidOffers.slice(0, 5).forEach(offer => {
            message += `• ${offer.company} - ${offer.role}: Missing ${offer.missingFields}\n`;
          });
          if (invalidOffers.length > 5) {
            message += `... and ${invalidOffers.length - 5} more\n`;
          }
          message += `\nPlease update these offers with the missing fields to fetch benchmarks.`;
        }
        alert(message);
        setFetchingBenchmarks(false);
        return;
      }

      console.log(`📊 Fetching benchmarks for ${validOffers.length} offer(s) out of ${allOffers.length} total offers`);
      
      setBenchmarkProgress({ current: 0, total: validOffers.length });

      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      const skippedOffers = [];

      // Fetch benchmark for each valid offer
      for (let i = 0; i < validOffers.length; i++) {
        const offer = validOffers[i];
        setBenchmarkProgress({ current: i + 1, total: validOffers.length });
        
        console.log(`🔄 Processing offer ${i + 1}/${validOffers.length}: ${offer.company} - ${offer.role_title} (ID: ${offer.id})`);
        
        try {
          const response = await autoFetchBenchmarkForOffer(offer.id);
          
          if (response.data?.success) {
            if (response.data.cached) {
              console.log(`✅ Benchmark already exists for offer ${offer.id} (cached)`);
              skippedCount++;
            } else {
              console.log(`✅ Successfully fetched benchmark for offer ${offer.id}`);
              successCount++;
            }
          } else {
            console.warn(`⚠️ Failed to fetch benchmark for offer ${offer.id}:`, response.data?.error || 'Unknown error');
            failCount++;
            skippedOffers.push(`${offer.company} - ${offer.role_title}`);
          }
          
          // Small delay to avoid rate limiting (1 second between requests)
          if (i < validOffers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`❌ Error fetching benchmark for offer ${offer.id}:`, err);
          failCount++;
          skippedOffers.push(`${offer.company} - ${offer.role_title}`);
        }
      }

      // Refresh data to show new benchmarks
      await loadData();

      // Build detailed result message
      let resultMessage = `Benchmark fetch complete!\n\n`;
      resultMessage += `Total offers: ${allOffers.length}\n`;
      resultMessage += `Valid offers (with required fields): ${validOffers.length}\n`;
      if (invalidOffers.length > 0) {
        resultMessage += `⚠️ Skipped (missing fields): ${invalidOffers.length}\n`;
      }
      resultMessage += `\n`;
      resultMessage += `✅ Successfully fetched: ${successCount}\n`;
      if (skippedCount > 0) {
        resultMessage += `📋 Already cached: ${skippedCount}\n`;
      }
      resultMessage += `❌ Failed: ${failCount}\n`;
      
      if (invalidOffers.length > 0) {
        resultMessage += `\n⚠️ Offers skipped (missing required fields):\n`;
        invalidOffers.slice(0, 5).forEach(offer => {
          resultMessage += `• ${offer.company} - ${offer.role}: Missing ${offer.missingFields}\n`;
        });
        if (invalidOffers.length > 5) {
          resultMessage += `... and ${invalidOffers.length - 5} more\n`;
        }
        resultMessage += `\n💡 Tip: Update these offers with Role Title, Role Level, and Location to fetch their benchmarks.`;
      }
      
      if (failCount > 0 && skippedOffers.length > 0) {
        resultMessage += `\n\n❌ Failed offers:\n${skippedOffers.slice(0, 5).join('\n')}`;
        if (skippedOffers.length > 5) {
          resultMessage += `\n... and ${skippedOffers.length - 5} more`;
        }
      }

      if (failCount > 0 && successCount === 0 && skippedCount === 0) {
        // All failed - likely API key issue
        resultMessage += `\n\n⚠️ All attempts failed. This is likely due to:\n`;
        resultMessage += `• Expired or invalid Google API key\n`;
        resultMessage += `• Missing GOOGLE_API_KEY in environment variables\n`;
        resultMessage += `• Rate limiting from Google API\n\n`;
        resultMessage += `Please check your API key configuration and try again.`;
      } else if (successCount > 0 || skippedCount > 0) {
        resultMessage += `\n\n✅ Market comparison data is now available!`;
      }

      alert(resultMessage);
    } catch (err) {
      console.error("Error fetching benchmarks:", err);
      
      // Check for API key errors
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      const isApiKeyError = errorMessage.includes("API key") || 
                           errorMessage.includes("API_KEY_INVALID") ||
                           err.response?.status === 401 ||
                           err.response?.status === 503;
      
      if (isApiKeyError) {
        alert(
          `Google API Key Error\n\n` +
          `Your Google API key has expired or is not configured.\n\n` +
          `To fix this:\n` +
          `1. Go to https://console.cloud.google.com/apis/credentials\n` +
          `2. Create or renew your API key\n` +
          `3. Add it to your .env file as GOOGLE_API_KEY\n` +
          `4. Restart your backend server\n\n` +
          `Error: ${errorMessage}`
        );
      } else {
        alert(
          `Error fetching benchmarks.\n\n` +
          `Details: ${errorMessage}\n\n` +
          `Check the browser console for more information.`
        );
      }
    } finally {
      setFetchingBenchmarks(false);
      setBenchmarkProgress({ current: 0, total: 0 });
    }
  };

  useEffect(() => {
    loadData();
    loadOffers();
    
    // Refresh data when window regains focus (user might have changed offer status in another tab/window)
    const handleFocus = () => {
      loadData();
      loadOffers();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadOffers = async () => {
    try {
      const res = await getOffers();
      setOffers(res.data.offers || []);
    } catch (err) {
      console.error("Error loading offers:", err);
    }
  };

  const handleAddRole = async () => {
    try {
      setAddingRole(true);
      
      // Validate required fields
      if (!newRoleData.company || !newRoleData.role_title || !newRoleData.start_date) {
        alert("Please fill in required fields: Company, Role Title, and Start Date");
        setAddingRole(false);
        return;
      }

      // Prepare data for API
      const roleData = {
        company: newRoleData.company,
        role_title: newRoleData.role_title,
        role_level: newRoleData.role_level || null,
        start_date: newRoleData.start_date,
        end_date: newRoleData.end_date || null,
        base_salary_start: newRoleData.base_salary_start ? Number(newRoleData.base_salary_start) : 0,
        total_comp_start: newRoleData.total_comp_start ? Number(newRoleData.total_comp_start) : (newRoleData.base_salary_start ? Number(newRoleData.base_salary_start) : 0),
        base_salary_current: newRoleData.base_salary_current || newRoleData.base_salary_start || null,
        total_comp_current: newRoleData.total_comp_current || newRoleData.total_comp_start || null,
        pto_days: newRoleData.pto_days ? Number(newRoleData.pto_days) : 0,
        benefits_value: newRoleData.benefits_value ? Number(newRoleData.benefits_value) : 0
      };

      await createCompensationHistory(roleData);
      
      // Reset form
      setNewRoleData({
        company: '',
        role_title: '',
        role_level: '',
        start_date: '',
        end_date: '',
        base_salary_start: '',
        total_comp_start: '',
        base_salary_current: '',
        total_comp_current: '',
        pto_days: '',
        benefits_value: ''
      });
      setShowAddRoleForm(false);
      
      // Reload data to show new role
      await loadData();
      
      alert("Role added successfully! Your compensation history has been updated.");
    } catch (err) {
      console.error("Error adding role:", err);
      alert(`Failed to add role: ${err.response?.data?.error || err.message || "Unknown error"}`);
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (roleId, company, roleTitle) => {
    const confirmMessage = `Are you sure you want to remove "${roleTitle} at ${company}" from your compensation history?\n\nThis action cannot be undone and will affect your career progression analytics.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setDeletingRoleId(roleId);
      await deleteCompensationHistory(roleId);
      await loadData(); // Refresh analytics
      alert(`Role "${roleTitle} at ${company}" has been removed from your compensation history.`);
    } catch (err) {
      console.error("Error deleting role:", err);
      alert(`Failed to delete role: ${err.response?.data?.error || err.message || "Unknown error"}`);
    } finally {
      setDeletingRoleId(null);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    const confirmMessage = "Accept this offer? This will create a compensation history entry and enable compensation evolution tracking.";
    if (!window.confirm(confirmMessage)) {
      return;
    }
    try {
      const response = await acceptOffer(offerId);
      await loadData(); // Refresh analytics
      await loadOffers(); // Refresh offers list
      
      if (response.data.warning) {
        let warningMessage = `Offer accepted!\n\n${response.data.warning}`;
        if (response.data.existingOffers && response.data.existingOffers.length > 0) {
          warningMessage += `\n\nExisting active offers:\n`;
          response.data.existingOffers.forEach(o => {
            warningMessage += `• ${o.company} - ${o.role_title}\n`;
          });
          warningMessage += `\nTip: You can update previous roles' end dates in the Compensation Evolution tab to mark them as past positions.`;
        }
        alert(warningMessage);
      } else {
        alert("Offer accepted! Compensation history entry created. Your compensation evolution timeline will now show this role.");
      }
    } catch (err) {
      console.error("Error accepting offer:", err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || "Unknown error";
      const errorHint = err.response?.data?.hint || "";
      alert(`Failed to accept offer.\n\nError: ${errorMessage}${errorHint ? `\n\n${errorHint}` : ''}\n\nCheck the browser console for more details.`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          No compensation data available. Start tracking offers to see analytics.
        </Alert>
        <button 
          onClick={() => window.location.reload()} 
          style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Refresh Page
        </button>
      </Box>
    );
  }

  // Safely destructure with defaults - wrap in try-catch to prevent crashes
  let offerTracking, negotiationAnalytics, marketComparisons, compensationEvolution, 
      careerProgression, recommendations, locationPositioning, industryPositioning, 
      jobSalaryAnalysis, salaryComparison;
  
  try {
    ({
      offerTracking = {
        totalOffers: 0,
        acceptedVsRejected: { accepted: 0, rejected: 0, pending: 0 },
        byRole: {},
        byCompany: {},
        byLocation: {},
        byLevel: {},
      competingOffers: 0,
      competingOffersDetails: [],
      negotiationOutcomes: []
      },
      negotiationAnalytics = {
        successRate: 0,
        avgImprovement: 0,
        medianImprovement: 0,
        maxImprovement: 0,
        trendsOverTime: {},
        byContext: {}
      },
      marketComparisons = [],
      compensationEvolution = {
        timeline: [],
        plateaus: [],
        growthPhases: [],
        milestones: []
      },
      careerProgression = {
        progression: [],
        earningPotential: {
          currentSalary: 0,
          avgGrowthRate: 0,
          projected1Year: 0,
          projected3Years: 0,
          projected5Years: 0,
          inflectionPoints: []
        },
        levelMapping: []
      },
      recommendations = [],
      locationPositioning = [],
      industryPositioning = [],
      jobSalaryAnalysis = {
        totalJobsWithSalary: 0,
        avgSalaryMin: 0,
        avgSalaryMax: 0,
        avgSalaryRange: 0,
        jobsWithOffers: 0,
        jobsWithoutOffers: 0
      },
      salaryComparison = []
    } = data || {});

    // Ensure acceptedVsRejected exists
    if (!offerTracking.acceptedVsRejected) {
      offerTracking.acceptedVsRejected = { accepted: 0, rejected: 0, pending: 0 };
    }

    console.log("Processed data:", {
      totalOffers: offerTracking.totalOffers,
      acceptedCount: offerTracking.acceptedCount,
      acceptedVsRejected: offerTracking.acceptedVsRejected,
      avgBaseSalary: offerTracking.avgBaseSalary,
      byLevel: offerTracking.byLevel,
      byRole: Object.keys(offerTracking.byRole || {}),
      byLocation: Object.keys(offerTracking.byLocation || {}),
      byCompany: Object.keys(offerTracking.byCompany || {}),
      offers: offerTracking,
      jobSalaryAnalysis,
      salaryComparison: salaryComparison?.length || 0,
      marketComparisons: marketComparisons?.length || 0,
      marketComparisonsData: marketComparisons
    });
  } catch (processErr) {
    console.error("Error processing compensation data:", processErr);
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error processing compensation data. Please refresh the page or contact support.
        <br />
        <small>{processErr.message}</small>
        <br />
        <button 
          onClick={() => window.location.reload()} 
          style={{ marginTop: '8px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Refresh Page
        </button>
      </Alert>
    );
  }

  // Prepare chart data
  const offerStatusData = [
    { name: 'Accepted', value: offerTracking.acceptedVsRejected.accepted, color: '#10b981' },
    { name: 'Pending', value: offerTracking.acceptedVsRejected.pending, color: '#f59e0b' },
    { name: 'Rejected', value: offerTracking.acceptedVsRejected.rejected, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const negotiationTrendsData = Object.entries(negotiationAnalytics.trendsOverTime || {})
    .map(([month, data]) => ({
      month,
      successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
      avgImprovement: data.improvements.length > 0
        ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
        : 0
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Define role level order for consistent display
  const roleLevelOrder = {
    'intern': 1,
    'entry': 2,
    'junior': 3,
    'mid': 4,
    'senior': 5,
    'staff': 6,
    'principal': 7,
    'lead': 8,
    'manager': 9,
    'director': 10,
    'vp': 11,
    'unknown': 12
  };
  
  const roleLevelData = Object.entries(offerTracking.byLevel || {})
    .filter(([level, data]) => data.count > 0) // Show all levels with offers, even if no salary data
    .map(([level, data]) => {
      const levelKey = level.toLowerCase();
      let displayName = level === 'unknown' ? 'Not Specified' : level.charAt(0).toUpperCase() + level.slice(1);
      
      // Handle common variations
      if (levelKey === 'mid' || levelKey === 'mid-level' || levelKey === 'midlevel') {
        displayName = 'Mid-Level';
      } else if (levelKey === 'entry' || levelKey === 'entry-level' || levelKey === 'entrylevel') {
        displayName = 'Entry-Level';
      }
      
      return {
        level: displayName,
        avgSalary: data.avgBase || 0,
        count: data.count,
        order: roleLevelOrder[levelKey] || 99
      };
    })
    .sort((a, b) => {
      // First sort by order (career progression), then by salary
      if (a.order !== b.order) return a.order - b.order;
      return b.avgSalary - a.avgSalary;
    });
  
  console.log("📊 Role Level Data:", {
    byLevel: offerTracking.byLevel,
    roleLevelData,
    totalLevels: Object.keys(offerTracking.byLevel || {}).length,
    displayedLevels: roleLevelData.length
  });

  // Helper function to format context keys to human-readable names
  const formatContextName = (contextKey) => {
    // Handle industry contexts: industry_tech -> "Technology"
    if (contextKey.startsWith('industry_')) {
      const industry = contextKey.replace('industry_', '');
      const industryMap = {
        'tech': 'Technology',
        'finance': 'Finance',
        'healthcare': 'Healthcare',
        'consulting': 'Consulting',
        'retail': 'Retail',
        'manufacturing': 'Manufacturing',
        'education': 'Education',
        'government': 'Government',
        'nonprofit': 'Non-Profit',
        'media': 'Media & Entertainment',
        'real_estate': 'Real Estate',
        'energy': 'Energy',
        'telecommunications': 'Telecommunications',
        'transportation': 'Transportation',
        'hospitality': 'Hospitality',
        'agriculture': 'Agriculture',
        'construction': 'Construction',
        'legal': 'Legal',
        'pharmaceutical': 'Pharmaceutical',
        'aerospace': 'Aerospace',
        'automotive': 'Automotive'
      };
      return industryMap[industry] || industry.charAt(0).toUpperCase() + industry.slice(1).replace(/_/g, ' ');
    }
    
    // Handle company size: company_size_medium -> "Medium Company"
    if (contextKey.startsWith('company_size_')) {
      const size = contextKey.replace('company_size_', '');
      const sizeMap = {
        'startup': 'Startup',
        'small': 'Small Company',
        'medium': 'Medium Company',
        'large': 'Large Company',
        'enterprise': 'Enterprise'
      };
      return sizeMap[size] || size.charAt(0).toUpperCase() + size.slice(1);
    }
    
    // Handle location type: location_type_on_site -> "On-Site"
    if (contextKey.startsWith('location_type_')) {
      const locationType = contextKey.replace('location_type_', '');
      const locationMap = {
        'remote': 'Remote',
        'hybrid': 'Hybrid',
        'on_site': 'On-Site',
        'flexible': 'Flexible'
      };
      return locationMap[locationType] || locationType.charAt(0).toUpperCase() + locationType.slice(1).replace(/_/g, '-');
    }
    
    // Handle role level: role_level_senior -> "Senior"
    if (contextKey.startsWith('role_level_')) {
      const level = contextKey.replace('role_level_', '');
      const levelMap = {
        'intern': 'Intern',
        'entry': 'Entry Level',
        'junior': 'Junior',
        'mid': 'Mid-Level',
        'senior': 'Senior',
        'staff': 'Staff',
        'principal': 'Principal',
        'lead': 'Lead',
        'manager': 'Manager',
        'director': 'Director',
        'vp': 'VP'
      };
      return levelMap[level] || level.charAt(0).toUpperCase() + level.slice(1);
    }
    
    // Default: capitalize and replace underscores
    return contextKey.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const contextMetricsData = Object.entries(negotiationAnalytics.byContext || {})
    .map(([context, data]) => ({
      context: formatContextName(context),
      successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
      avgImprovement: data.improvements.length > 0
        ? data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length
        : 0,
      count: data.count
    }))
    .filter(d => d.count >= 2)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);

  const evolutionData = compensationEvolution.timeline.map(role => ({
    date: role.start_date,
    baseSalary: Number(role.base_salary_start) || 0,
    totalComp: Number(role.total_comp_start) || 0,
    roleLevel: role.role_level,
    increasePercent: role.increasePercent || 0
  }));

  const marketComparisonData = marketComparisons
    .map(comp => {
      // Validate and clamp percentile to 0-100 range
      let percentile = Number(comp.percentile) || 0;
      // If percentile is way too high (likely a data error), cap it at 100
      if (percentile > 100) {
        console.warn(`Invalid percentile value for ${comp.company}: ${percentile}, capping at 100`);
        percentile = 100;
      }
      if (percentile < 0) {
        percentile = 0;
      }
      
      return {
        company: comp.company,
        percentile: percentile,
        salary: comp.yourSalary,
        marketMedian: comp.marketMedian
      };
    })
    .filter(d => d.percentile >= 0 && d.percentile <= 100); // Filter out invalid data

  return (
    <Box>
      {/* Header */}
      <Box className="statistics-header">
        <Typography className="statistics-main-title">Comprehensive Compensation Analytics</Typography>
        <Typography className="statistics-main-subtitle">
          Track your salary progression, negotiation success, market positioning, and career growth
        </Typography>
        <Box display="flex" gap={1} justifyContent="center" sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                await recalculateCompetingOffers();
                loadData();
              } catch (err) {
                console.error("Error recalculating competing offers:", err);
              }
            }}
            disabled={loading}
            sx={{ 
              minWidth: '140px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#c4b5fd',
              '&:hover': {
                background: 'rgba(139, 92, 246, 0.3)',
                borderColor: 'rgba(139, 92, 246, 0.6)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
              },
            }}
            size="small"
          >
            Recalc Competing
          </Button>
          <Button
            variant="outlined"
            onClick={loadData}
            disabled={loading}
            sx={{ 
              minWidth: '120px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#c4b5fd',
              '&:hover': {
                background: 'rgba(139, 92, 246, 0.3)',
                borderColor: 'rgba(139, 92, 246, 0.6)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
              },
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Inner Tabs */}
      <Box className="inner-nav-container">
        <button
          className={`inner-nav-tab compensation ${tabValue === 0 ? 'active' : ''}`}
          onClick={() => setTabValue(0)}
        >
          Overview
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 1 ? 'active' : ''}`}
          onClick={() => setTabValue(1)}
        >
          Salary & Offers
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 2 ? 'active' : ''}`}
          onClick={() => setTabValue(2)}
        >
          Negotiation
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 3 ? 'active' : ''}`}
          onClick={() => setTabValue(3)}
        >
          Market Comparison
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 4 ? 'active' : ''}`}
          onClick={() => setTabValue(4)}
        >
          Evolution
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 5 ? 'active' : ''}`}
          onClick={() => setTabValue(5)}
        >
          Career Progression
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 6 ? 'active' : ''}`}
          onClick={() => setTabValue(6)}
        >
          Strategy
        </button>
        <button
          className={`inner-nav-tab compensation ${tabValue === 7 ? 'active' : ''}`}
          onClick={() => setTabValue(7)}
        >
          Job vs Offer
        </button>
      </Box>

          {/* Tab 0: Overview */}
        <TabPanel value={tabValue} index={0}>
          {offerTracking.totalOffers === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No offers tracked yet
              </Typography>
              <Typography variant="body2">
                To get started with compensation analytics, add your first job offer. 
                You can add offers from the Compensation page or directly from job applications.
              </Typography>
            </Alert>
          )}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Total Offers"
                value={offerTracking.totalOffers}
                subtitle={offerTracking.totalOffers > 0 
                  ? `${offerTracking.acceptedVsRejected?.accepted || 0} accepted` 
                  : jobSalaryAnalysis.totalJobsWithSalary > 0
                  ? `${jobSalaryAnalysis.totalJobsWithSalary} jobs with salary data`
                  : "Add offers to track"}
                color="#3b82f6"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Negotiation Success"
                value={`${(Number(negotiationAnalytics.successRate) || 0).toFixed(1)}%`}
                subtitle={`${(Number(negotiationAnalytics.avgImprovement) || 0).toFixed(1)}% avg improvement`}
                color="#10b981"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Market Position"
                value={marketComparisons.length > 0 
                  ? `${(marketComparisons.filter(m => !m.isUnderpaid).length / marketComparisons.length * 100).toFixed(0)}%`
                  : 'N/A'}
                subtitle={marketComparisons.length > 0 
                  ? `${marketComparisons.filter(m => !m.isUnderpaid).length} of ${marketComparisons.length} at/above market`
                  : 'No market data'}
                color="#8b5cf6"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Career Growth"
                value={(Number(careerProgression.earningPotential.avgGrowthRate) || 0) > 0
                  ? `${(Number(careerProgression.earningPotential.avgGrowthRate) || 0).toFixed(1)}%`
                  : 'N/A'}
                subtitle="Average annual growth rate"
                color="#f59e0b"
              />
            </Grid>
          </Grid>

          {/* Quick Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Offer Status Distribution</Typography>
                  {offerStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
                        <Pie
                          data={offerStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={65}
                          innerRadius={30}
                          paddingAngle={3}
                          label={false}
                        >
                          {offerStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => {
                            const total = offerStatusData.reduce((sum, d) => sum + d.value, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return [`${value} (${percent}%)`, name];
                          }}
                          contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={60}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '20px', color: '#e2e8f0' }}
                          style={{ fontSize: '14px', wordWrap: 'break-word', color: '#e2e8f0' }}
                          formatter={(value) => {
                            const entry = offerStatusData.find(d => d.name === value);
                            const total = offerStatusData.reduce((sum, d) => sum + d.value, 0);
                            const percent = entry ? ((entry.value / total) * 100).toFixed(0) : 0;
                            return `${value}: ${entry?.value || 0} (${percent}%)`;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                      No offer data available
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Average Salary by Role Level</Typography>
                  {roleLevelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={roleLevelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <XAxis dataKey="level" tick={{ fill: '#e2e8f0' }} />
                        <YAxis tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: '#e2e8f0' }} />
                        <Tooltip formatter={(v) => `$${v.toLocaleString()}`} contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }} />
                        <Bar dataKey="avgSalary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                      No role level data available
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Salary & Offer Tracking */}
        <TabPanel value={tabValue} index={1}>
          {/* Summary Statistics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="statistics-card" sx={{ textAlign: 'center', height: '100%' }}>
                <Box className="statistics-card-content">
                  <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600, mb: 1 }}>
                    Total Offers
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#c4b5fd', mb: 0.5 }}>
                    {offerTracking.totalOffers || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                    All time
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="statistics-card" sx={{ textAlign: 'center', height: '100%' }}>
                <Box className="statistics-card-content">
                  <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600, mb: 1 }}>
                    Accepted
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#5eead4', mb: 0.5 }}>
                    {offerTracking.acceptedCount !== undefined 
                      ? offerTracking.acceptedCount 
                      : (offerTracking.acceptedVsRejected?.accepted || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                    {(() => {
                      const accepted = offerTracking.acceptedCount !== undefined 
                        ? offerTracking.acceptedCount 
                        : (offerTracking.acceptedVsRejected?.accepted || 0);
                      return offerTracking.totalOffers > 0 
                        ? Math.round((Number(accepted) / Number(offerTracking.totalOffers)) * 100) 
                        : 0;
                    })()}% acceptance rate
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box className="statistics-card" sx={{ textAlign: 'center', height: '100%' }}>
                <Box className="statistics-card-content">
                  <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600, mb: 1 }}>
                    Avg Salary
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#60a5fa', mb: 0.5 }}>
                    ${offerTracking.avgBaseSalary > 0 ? Math.round(offerTracking.avgBaseSalary).toLocaleString() : '0'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                    Base salary
                  </Typography>
                </Box>
              </Box>
            </Grid>
            {offerTracking.competingOffers > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <Box className="statistics-card" sx={{ textAlign: 'center', height: '100%' }}>
                  <Box className="statistics-card-content">
                    <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', fontWeight: 600, mb: 1 }}>
                      Competing Offers
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 900, color: '#fbbf24', mb: 0.5 }}>
                      {offerTracking.competingOffers}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                      With competition
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

          {/* Main Content Grid */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Offers by Role */}
            <Grid item xs={12} md={6}>
              <Box className="statistics-card" sx={{ height: '100%' }}>
                <Box className="statistics-card-content">
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                      Offers by Role
                    </Typography>
                    <Chip 
                      label={`${offers.filter(o => o.role_title && o.role_title.trim() !== '').length} offers`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(139, 92, 246, 0.2)',
                        color: '#c4b5fd',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                      }}
                    />
                  </Box>
                  {offers.length > 0 ? (
                    <Box>
                      {offers
                        .filter(offer => offer.role_title && offer.role_title.trim() !== '')
                        .sort((a, b) => {
                          // Sort by role title first, then by salary (descending)
                          if (a.role_title !== b.role_title) {
                            return a.role_title.localeCompare(b.role_title);
                          }
                          return (Number(b.base_salary) || 0) - (Number(a.base_salary) || 0);
                        })
                        .slice(0, 20) // Show up to 20 offers
                        .map((offer, idx) => (
                          <Box 
                            key={offer.id} 
                            sx={{ 
                              mb: 1.5, 
                              p: 2, 
                              bgcolor: 'rgba(139, 92, 246, 0.08)', 
                              borderRadius: 2, 
                              border: '1px solid rgba(139, 92, 246, 0.15)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'rgba(139, 92, 246, 0.12)',
                                borderColor: 'rgba(139, 92, 246, 0.25)',
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c4b5fd', mb: 0.5, fontSize: '0.95rem' }}>
                                  {offer.role_title}
                                </Typography>
                                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                    {offer.company || 'Unknown Company'}
                                  </Typography>
                                  {offer.base_salary && Number(offer.base_salary) > 0 ? (
                                    <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                                      ${Number(offer.base_salary).toLocaleString()}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                      No salary data
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Box sx={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                bgcolor: 'rgba(139, 92, 246, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ml: 2,
                              }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#c4b5fd', fontSize: '1rem' }}>
                                  {idx + 1}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>No offers available</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Offers by Location */}
            <Grid item xs={12} md={6}>
              <Box className="statistics-card" sx={{ height: '100%' }}>
                <Box className="statistics-card-content">
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                      Offers by Location
                    </Typography>
                    <Chip 
                      label={`${Object.keys(offerTracking.byLocation || {}).length} locations`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                      }}
                    />
                  </Box>
                  {Object.keys(offerTracking.byLocation || {}).length > 0 ? (
                    <Box>
                      {Object.entries(offerTracking.byLocation)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 8)
                        .map(([location, data], idx) => (
                          <Box 
                            key={location} 
                            sx={{ 
                              mb: 1.5, 
                              p: 2, 
                              bgcolor: 'rgba(59, 130, 246, 0.08)', 
                              borderRadius: 2, 
                              border: '1px solid rgba(59, 130, 246, 0.15)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'rgba(59, 130, 246, 0.12)',
                                borderColor: 'rgba(59, 130, 246, 0.25)',
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#93c5fd', mb: 0.5, fontSize: '0.95rem' }}>
                                  {location}
                                </Typography>
                                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                    {data.count} offer{data.count !== 1 ? 's' : ''}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                                    ${data.avgBase.toLocaleString()}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                bgcolor: 'rgba(59, 130, 246, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ml: 2,
                              }}>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: '#93c5fd', fontSize: '1rem' }}>
                                  {idx + 1}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>No location data available</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Industry Positioning */}
            <Grid item xs={12} md={6}>
              <Box className="statistics-card" sx={{ height: '100%' }}>
                <Box className="statistics-card-content">
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                      Industry Positioning
                    </Typography>
                    <Chip 
                      label={`${industryPositioning.length} industries`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                      }}
                    />
                  </Box>
                  {industryPositioning.length > 0 ? (
                    <Box>
                      {industryPositioning
                        .sort((a, b) => {
                          const aCount = (a.offers?.length || 0) + (a.jobs?.length || 0);
                          const bCount = (b.offers?.length || 0) + (b.jobs?.length || 0);
                          return bCount - aCount;
                        })
                        .slice(0, 8)
                        .map((ind, idx) => {
                          const totalCount = (ind.offers?.length || 0) + (ind.jobs?.length || 0);
                          const offersCount = ind.offers?.length || 0;
                          const jobsCount = ind.jobs?.length || 0;
                          
                          return (
                            <Box 
                              key={idx} 
                              sx={{ 
                                mb: 1.5, 
                                p: 2, 
                                bgcolor: 'rgba(59, 130, 246, 0.08)', 
                                borderRadius: 2, 
                                border: '1px solid rgba(59, 130, 246, 0.15)',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(59, 130, 246, 0.12)',
                                  borderColor: 'rgba(59, 130, 246, 0.25)',
                                  transform: 'translateX(4px)',
                                },
                              }}
                            >
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#93c5fd', mb: 0.5, fontSize: '0.95rem' }}>
                                    {ind.industry}
                                  </Typography>
                                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                      {totalCount > 0 ? (
                                        <>
                                          {offersCount > 0 && `${offersCount} offer${offersCount !== 1 ? 's' : ''}`}
                                          {offersCount > 0 && jobsCount > 0 && ' • '}
                                          {jobsCount > 0 && `${jobsCount} job${jobsCount !== 1 ? 's' : ''}`}
                                        </>
                                      ) : (
                                        'No data'
                                      )}
                                    </Typography>
                                    {ind.avgSalary > 0 && (
                                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                                        ${Number(ind.avgSalary || 0).toLocaleString()}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                                <Box sx={{ 
                                  width: '40px', 
                                  height: '40px', 
                                  borderRadius: '50%', 
                                  bgcolor: 'rgba(59, 130, 246, 0.25)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  ml: 2,
                                }}>
                                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#93c5fd', fontSize: '1rem' }}>
                                    {idx + 1}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>No industry data available</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Negotiation Outcomes & Competing Offers Row */}
          <Grid container spacing={3}>
            {/* Negotiation Outcomes */}
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                      Negotiation Outcomes
                    </Typography>
                    <Chip 
                      label={`${offerTracking.negotiationOutcomes.length} attempts`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                        color: '#5eead4',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '22px',
                      }}
                    />
                  </Box>
                  {offerTracking.negotiationOutcomes.length > 0 ? (
                    <Box>
                      {offerTracking.negotiationOutcomes.slice(0, 6).map((outcome, idx) => {
                        const improvement = Number(outcome.improvement) || 0;
                        const isSuccess = outcome.outcome === 'success';
                        return (
                          <Box 
                            key={idx} 
                            sx={{ 
                              mb: 1.5, 
                              p: 2, 
                              bgcolor: isSuccess ? 'rgba(16, 185, 129, 0.08)' : 'rgba(139, 92, 246, 0.08)', 
                              borderRadius: 2, 
                              border: `1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.15)'}`,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                borderColor: isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.25)',
                                transform: 'translateX(4px)',
                              },
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="start">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isSuccess ? '#5eead4' : '#c4b5fd', mb: 0.5, fontSize: '0.95rem' }}>
                                  {outcome.company || 'Unknown Company'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1, fontSize: '0.85rem' }}>
                                  {outcome.role || 'Unknown Role'}
                                </Typography>
                                <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                                  {improvement > 0 && (
                                    <Chip 
                                      label={`+${improvement.toFixed(1)}%`}
                                      size="small"
                                      sx={{
                                        bgcolor: 'rgba(16, 185, 129, 0.2)',
                                        color: '#5eead4',
                                        fontWeight: 700,
                                        fontSize: '0.7rem',
                                        height: '20px',
                                      }}
                                    />
                                  )}
                                  <Chip 
                                    label={outcome.outcome === 'success' ? 'Success' : outcome.outcome || 'Unknown'}
                                    size="small"
                                    sx={{
                                      bgcolor: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                      color: isSuccess ? '#5eead4' : '#e2e8f0',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: '20px',
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1, fontSize: '0.95rem', fontWeight: 500 }}>
                        No negotiation data available
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                        Update offers with negotiated salaries to see outcomes
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Competing Offers - Only show if there are competing offers */}
            {offerTracking.competingOffers > 0 && offerTracking.competingOffersDetails && offerTracking.competingOffersDetails.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box className="statistics-card">
                  <Box className="statistics-card-content">
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.1rem' }}>
                        Competing Offers
                      </Typography>
                      <Chip 
                        label={`${offerTracking.competingOffers} active`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(245, 158, 11, 0.2)',
                          color: '#fcd34d',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: '22px',
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 3, fontSize: '0.875rem', lineHeight: 1.6 }}>
                        You have <strong style={{ color: '#fcd34d' }}>{offerTracking.competingOffers}</strong> offer{offerTracking.competingOffers !== 1 ? 's' : ''} with competing offers, which can strengthen your negotiation position.
                      </Typography>
                      {offerTracking.competingOffersDetails.map((offerGroup, idx) => (
                        <Box 
                          key={idx} 
                          sx={{ 
                            mb: 2, 
                            p: 2.5, 
                            bgcolor: 'rgba(245, 158, 11, 0.1)', 
                            borderRadius: 2, 
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: 'rgba(245, 158, 11, 0.15)',
                              borderColor: 'rgba(245, 158, 11, 0.4)',
                            },
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="start" sx={{ mb: 1.5 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fcd34d', mb: 0.5, fontSize: '0.95rem' }}>
                                {offerGroup.company} - {offerGroup.role}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>
                                ${offerGroup.salary.toLocaleString()}
                              </Typography>
                            </Box>
                            <Chip 
                              label={`${offerGroup.competingCount} competing`}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(245, 158, 11, 0.2)',
                                color: '#fcd34d',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: '22px',
                              }}
                            />
                          </Box>
                          {offerGroup.competingOffers && offerGroup.competingOffers.length > 0 && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                              <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700, display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                Competing Offers:
                              </Typography>
                              {offerGroup.competingOffers.map((competing, compIdx) => (
                                <Box 
                                  key={compIdx} 
                                  sx={{ 
                                    mb: 1, 
                                    p: 1.5, 
                                    bgcolor: 'rgba(139, 92, 246, 0.08)', 
                                    borderRadius: 1.5,
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                  }}
                                >
                                  <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#c4b5fd' }}>
                                      {competing.company}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.85rem', color: '#5eead4', fontWeight: 700 }}>
                                      ${competing.salary.toLocaleString()}
                                    </Typography>
                                  </Box>
                                  {competing.role && (
                                    <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                                      {competing.role}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab 2: Negotiation Analytics */}
        <TabPanel value={tabValue} index={2}>
          {negotiationAnalytics.successRate === 0 && Object.keys(negotiationAnalytics.trendsOverTime || {}).length === 0 ? (
            <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#e2e8f0' }}>
                No negotiation data available
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                To see negotiation analytics, you need to:
                <br />1. Create offers with base salaries
                <br />2. Update offers with higher salaries (negotiated amounts)
                <br />3. Add negotiation notes in the offer form
              </Typography>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Negotiation Success Metrics</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', fontWeight: 600 }}>Success Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#5eead4', mt: 0.5 }}>
                          {(Number(negotiationAnalytics.successRate) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(139, 92, 246, 0.15)', borderRadius: 2, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', fontWeight: 600 }}>Avg Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#c4b5fd', mt: 0.5 }}>
                          {(Number(negotiationAnalytics.avgImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', fontWeight: 600 }}>Median Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#fcd34d', mt: 0.5 }}>
                          {(Number(negotiationAnalytics.medianImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: 'rgba(236, 72, 153, 0.15)', borderRadius: 2, border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                        <Typography variant="caption" sx={{ color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem', fontWeight: 600 }}>Max Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#f9a8d4', mt: 0.5 }}>
                          {(Number(negotiationAnalytics.maxImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Negotiation Trends Over Time</Typography>
                  {negotiationTrendsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={negotiationTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <XAxis dataKey="month" tick={{ fill: '#e2e8f0' }} />
                        <YAxis tick={{ fill: '#e2e8f0' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }} />
                        <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                        <Area 
                          type="monotone" 
                          dataKey="successRate" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                          name="Success Rate %"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avgImprovement" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                          name="Avg Improvement %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                      No negotiation trends data
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box className="statistics-card" sx={{ mt: 3 }}>
            <Box className="statistics-card-content">
              <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Negotiation Success by Context</Typography>
              {contextMetricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contextMetricsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#e2e8f0' }} />
                    <YAxis type="category" dataKey="context" width={150} tick={{ fill: '#e2e8f0' }} />
                    <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                    <Bar dataKey="successRate" fill="#10b981" name="Success Rate %" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgImprovement" fill="#3b82f6" name="Avg Improvement %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                  No context-based negotiation data
                </Typography>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Tab 3: Market Comparison */}
        <TabPanel value={tabValue} index={3}>
          {marketComparisons.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#e2e8f0' }}>
                No market comparison data available
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 2 }}>
                  Market comparisons require benchmark data in the database. Currently, there are no market benchmarks configured.
                </Typography>
                <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 2 }}>
                  <strong style={{ color: '#c4b5fd' }}>Quick Solution:</strong> Use AI to automatically fetch market benchmarks for all your offers!
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleFetchBenchmarks}
                  disabled={fetchingBenchmarks || loading}
                  sx={{ 
                    mt: 1,
                    bgcolor: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#c4b5fd',
                    '&:hover': {
                      bgcolor: 'rgba(139, 92, 246, 0.3)',
                      borderColor: 'rgba(139, 92, 246, 0.6)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                    },
                  }}
                  startIcon={fetchingBenchmarks ? <CircularProgress size={16} /> : null}
                >
                  {fetchingBenchmarks 
                    ? `Fetching... (${benchmarkProgress.current}/${benchmarkProgress.total})`
                    : 'Fetch Market Benchmarks with AI'
                  }
                </Button>
                {fetchingBenchmarks && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>
                      Fetching benchmarks for your offers using Google Gemini AI...
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: 'rgba(139, 92, 246, 0.2)', borderRadius: 1, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          height: 8, 
                          bgcolor: '#8b5cf6',
                          width: `${(benchmarkProgress.current / benchmarkProgress.total) * 100}%`,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#e2e8f0', mt: 0.5 }}>
                      {benchmarkProgress.current} of {benchmarkProgress.total} offers processed
                    </Typography>
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                    <strong style={{ color: '#c4b5fd' }}>Manual Option:</strong> You can also manually add market benchmark data to the <code style={{ color: '#c4b5fd' }}>market_benchmarks</code> table in your database.
                  </Typography>
                </Box>
              </Box>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Market Position Summary</Typography>
                  {marketComparisons.length > 0 ? (
                    <Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#fca5a5', fontWeight: 700 }}>
                          Under Market: {marketComparisons.filter(m => m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#5eead4', fontWeight: 700 }}>
                          At/Above Market: {marketComparisons.filter(m => !m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        <Typography variant="body2" sx={{ color: '#fcd34d', fontWeight: 700 }}>
                          Significantly Under: {marketComparisons.filter(m => m.significantlyUnderpaid).length}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      No market comparison data available. Add market benchmarks to compare your offers.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Percentile Distribution</Typography>
                  {marketComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart 
                        data={marketComparisonData}
                        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                        <XAxis 
                          dataKey="company" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          label={{ value: 'Percentile', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#e2e8f0' } }}
                          width={60}
                          tick={{ fill: '#e2e8f0' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'percentile') {
                              const numValue = Number(value) || 0;
                              return [`${numValue.toFixed(1)}th percentile`, 'Percentile'];
                            }
                            if (name === 'salary' || name === 'marketMedian') {
                              return [`$${Number(value).toLocaleString()}`, name === 'salary' ? 'Your Salary' : 'Market Median'];
                            }
                            return [value, name];
                          }}
                          contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '4px', color: '#e2e8f0' }}
                        />
                        <Scatter 
                          dataKey="percentile" 
                          fill="#3b82f6"
                          name="Percentile"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                      No percentile data
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box className="statistics-card" sx={{ mt: 3 }}>
            <Box className="statistics-card-content">
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>Detailed Market Comparisons</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleFetchBenchmarks}
                  disabled={fetchingBenchmarks || loading}
                  startIcon={fetchingBenchmarks ? <CircularProgress size={14} /> : null}
                >
                  {fetchingBenchmarks 
                    ? `Fetching... (${benchmarkProgress.current}/${benchmarkProgress.total})`
                    : 'Fetch More Benchmarks'
                  }
                </Button>
              </Box>
              {marketComparisons && marketComparisons.length > 0 ? (
                <Box>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2, fontStyle: 'italic' }}>
                    Showing {marketComparisons.length} market comparison{marketComparisons.length !== 1 ? 's' : ''}
                  </Typography>
                  {marketComparisons.map((comp, idx) => {
                    // Ensure all required fields exist
                    if (!comp || !comp.company || !comp.role) {
                      return null;
                    }
                    
                    const yourSalary = Number(comp.yourSalary) || 0;
                    const marketMedian = Number(comp.marketMedian) || 0;
                    const percentile = Number(comp.percentile) || 0;
                    const difference = yourSalary - marketMedian;
                    
                    return (
                      <Box key={comp.offerId || idx} sx={{ mb: 2, p: 2.5, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 2, border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1.5}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#c4b5fd', mb: 0.5 }}>
                              {comp.company} - {comp.role}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
                              {comp.level || 'N/A'} • {comp.location || 'N/A'}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${percentile.toFixed(1)}th percentile`}
                            size="small"
                            sx={{ 
                              fontWeight: 700,
                              bgcolor: comp.isUnderpaid ? 'rgba(239, 68, 68, 0.2)' : comp.isOverpaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                              color: comp.isUnderpaid ? '#fca5a5' : comp.isOverpaid ? '#5eead4' : '#c4b5fd',
                              fontSize: '0.7rem',
                              height: '24px',
                            }}
                          />
                        </Box>
                        <Box display="flex" gap={2} mt={1.5} flexWrap="wrap">
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                            <strong style={{ color: '#c4b5fd' }}>Your Salary:</strong> ${yourSalary.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                            <strong style={{ color: '#c4b5fd' }}>Market Median:</strong> ${marketMedian.toLocaleString()}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: difference < 0 ? '#fca5a5' : '#5eead4',
                              fontWeight: 700
                            }}
                          >
                            <strong>Difference:</strong> {difference < 0 ? '-' : '+'}
                            ${Math.abs(difference).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                  No market comparison data available. Fetch benchmarks for your offers to see comparisons.
                </Typography>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Tab 4: Compensation Evolution */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>Compensation Evolution</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowAddRoleForm(true)}
              startIcon={null}
            >
              Add Past Role
            </Button>
          </Box>
          {compensationEvolution.timeline.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#e2e8f0' }}>
                No compensation history available
              </Typography>
              <Typography variant="body2">
                Compensation evolution tracking requires compensation history entries.
                <br />
                <br />
                To track compensation evolution:
                <br />1. Accept an offer (this creates a compensation history entry)
                <br />2. Add multiple roles/jobs to your compensation history using the "Add Past Role" button above
                <br />3. The system will track your salary progression over time
              </Typography>
              {offers.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setShowOffersList(!showOffersList)}
                    sx={{ mb: 2 }}
                  >
                    {showOffersList ? 'Hide' : 'Show'} Pending Offers ({offers.filter(o => o.offer_status === 'pending').length})
                  </Button>
                  {showOffersList && (
                    <Box>
                      {offers.filter(o => o.offer_status === 'pending').length > 0 ? (
                        offers
                          .filter(o => o.offer_status === 'pending')
                          .map(offer => (
                            <Box key={offer.id} className="statistics-card" sx={{ mb: 2 }}>
                              <Box className="statistics-card-content">
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#c4b5fd', mb: 0.5 }}>
                                      {offer.company} - {offer.role_title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1, fontSize: '0.875rem' }}>
                                      {offer.role_level} • {offer.location}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                                      <strong style={{ color: '#c4b5fd' }}>Base Salary:</strong> ${Number(offer.base_salary || 0).toLocaleString()}
                                      {offer.total_comp_year1 && (
                                        <> • <strong style={{ color: '#c4b5fd' }}>Total Comp:</strong> ${Number(offer.total_comp_year1).toLocaleString()}</>
                                      )}
                                    </Typography>
                                  </Box>
                                  <Button
                                    variant="contained"
                                    onClick={() => handleAcceptOffer(offer.id)}
                                    sx={{ 
                                      ml: 2,
                                      bgcolor: 'rgba(16, 185, 129, 0.2)',
                                      border: '1px solid rgba(16, 185, 129, 0.4)',
                                      color: '#5eead4',
                                      '&:hover': {
                                        bgcolor: 'rgba(16, 185, 129, 0.3)',
                                        borderColor: 'rgba(16, 185, 129, 0.6)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                                      },
                                    }}
                                  >
                                    Accept Offer
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          ))
                      ) : (
                        <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                          No pending offers. Create offers from your job applications to accept them.
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Alert>
          ) : null}
          <Box className="statistics-card" sx={{ mb: 3 }}>
            <Box className="statistics-card-content">
              <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Compensation Timeline</Typography>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => new Date(v).getFullYear()}
                      tick={{ fill: '#e2e8f0' }}
                    />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: '#e2e8f0' }} />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                    <Line 
                      type="monotone" 
                      dataKey="baseSalary" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Base Salary"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalComp" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Total Compensation"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                  No compensation history data
                </Typography>
              )}
            </Box>
          </Box>

          {/* Milestones & Achievements */}
          {compensationEvolution.milestones && compensationEvolution.milestones.length > 0 && (
            <Box className="statistics-card" sx={{ mb: 3, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%)', border: '1px solid rgba(139, 92, 246, 0.5)' }}>
              <Box className="statistics-card-content">
                <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>
                  Career Milestones & Achievements
                </Typography>
                <Grid container spacing={2}>
                  {compensationEvolution.milestones.map((milestone, idx) => {
                    let title = '';
                    let description = '';
                    
                    if (milestone.type === 'first_100k') {
                      title = 'First $100K Salary';
                      description = `Reached $100K base salary milestone`;
                    } else if (milestone.type === 'first_150k') {
                      title = 'First $150K Salary';
                      description = `Reached $150K base salary milestone`;
                    } else if (milestone.type === 'first_200k_tc') {
                      title = 'First $200K Total Comp';
                      description = `Reached $200K total compensation milestone`;
                    } else if (milestone.type === 'promotion') {
                      title = 'Promotion';
                      description = `Promoted from ${milestone.from} to ${milestone.to}`;
                      if (milestone.increase) {
                        description += ` (+${Number(milestone.increase).toFixed(1)}% increase)`;
                      }
                    }
                    
                    return (
                      <Grid item xs={12} sm={6} md={3} key={idx}>
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(59, 130, 246, 0.1)', 
                          borderRadius: 2,
                          border: '2px solid #3b82f6',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)'
                        }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#e2e8f0', mb: 0.5 }}>
                            {title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1, fontSize: '0.85rem' }}>
                            {description}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
                            {milestone.value ? `$${Number(milestone.value).toLocaleString()}` : ''} • {new Date(milestone.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          )}

          {/* All Roles List with Delete Option */}
          {compensationEvolution.timeline.length > 0 && (
            <Box className="statistics-card" sx={{ mb: 3 }}>
              <Box className="statistics-card-content">
                <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>All Roles in Compensation History</Typography>
                <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 2 }}>
                  Manage your compensation history. You can remove roles that are no longer relevant.
                </Typography>
                <Box>
                  {compensationEvolution.timeline.map((role, idx) => {
                    const isActive = !role.end_date || new Date(role.end_date) >= new Date();
                    return (
                      <Box 
                        key={role.id || idx} 
                        className="statistics-card"
                        sx={{ 
                          mb: 2, 
                          borderLeft: `4px solid ${isActive ? '#10b981' : '#94a3b8'}`,
                          bgcolor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        }}
                      >
                        <Box className="statistics-card-content">
                          <Box display="flex" justifyContent="space-between" alignItems="start">
                            <Box sx={{ flex: 1 }}>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#c4b5fd' }}>
                                  {role.role_title} at {role.company}
                                </Typography>
                                {isActive && (
                                  <Chip 
                                    label="Active" 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: 'rgba(16, 185, 129, 0.2)',
                                      color: '#5eead4',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: '20px',
                                    }} 
                                  />
                                )}
                                {role.end_date && (
                                  <Chip 
                                    label="Past" 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: 'rgba(148, 163, 184, 0.2)',
                                      color: '#cbd5e1',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: '20px',
                                    }} 
                                  />
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1, fontSize: '0.875rem' }}>
                                Level: {role.role_level || 'N/A'} • 
                                Start: {role.start_date ? new Date(role.start_date).toLocaleDateString() : 'N/A'}
                                {role.end_date && ` • End: ${new Date(role.end_date).toLocaleDateString()}`}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                                <strong style={{ color: '#c4b5fd' }}>Base Salary:</strong> ${Number(role.base_salary_current || role.base_salary_start || 0).toLocaleString()} • 
                                <strong style={{ color: '#c4b5fd' }}> Total Comp:</strong> ${Number(role.total_comp_current || role.total_comp_start || 0).toLocaleString()}
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleDeleteRole(role.id, role.company, role.role_title)}
                              disabled={deletingRoleId === role.id}
                              sx={{ 
                                ml: 2,
                                bgcolor: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#fca5a5',
                                '&:hover': {
                                  bgcolor: 'rgba(239, 68, 68, 0.3)',
                                  borderColor: 'rgba(239, 68, 68, 0.6)',
                                },
                              }}
                            >
                              {deletingRoleId === role.id ? (
                                <>
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                  Deleting...
                                </>
                              ) : (
                                'Remove'
                              )}
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Growth Phases</Typography>
                  {compensationEvolution.growthPhases.length > 0 ? (
                    <Box>
                      {compensationEvolution.growthPhases.map((phase, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5eead4', mb: 0.5 }}>
                            {phase.fromLevel} → {phase.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                            {(Number(phase.salaryIncrease) || 0).toFixed(1)}% increase • {(Number(phase.annualizedIncrease) || 0).toFixed(1)}% annualized
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                            {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      No significant growth phases detected
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Plateau Periods</Typography>
                  {compensationEvolution.plateaus.length > 0 ? (
                    <Box>
                      {compensationEvolution.plateaus.map((plateau, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', borderRadius: 2, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fcd34d', mb: 0.5 }}>
                            Plateau Detected
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                            {(Number(plateau.durationYears) || 0).toFixed(1)} years • {(Number(plateau.annualizedIncrease) || 0).toFixed(1)}% annualized growth
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
                            {new Date(plateau.startDate).toLocaleDateString()} - {new Date(plateau.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      No plateau periods detected
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 5: Career Progression */}
        <TabPanel value={tabValue} index={5}>
          {careerProgression.progression.length === 0 && careerProgression.earningPotential.currentSalary === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No career progression data available
              </Typography>
              <Typography variant="body2">
                Career progression analysis requires compensation history with multiple roles.
                <br />
                <br />
                To see career progression:
                <br />1. Accept offers to create compensation history entries
                <br />2. Add role levels (intern, junior, mid, senior, etc.) to your offers
                <br />3. Track multiple roles over time to see progression patterns
              </Typography>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Earning Potential</Typography>
                  {careerProgression.earningPotential.isEstimated && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="caption">
                        Using industry-standard growth rate estimates. Add more roles to your compensation history for personalized projections.
                      </Typography>
                    </Alert>
                  )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>Current Salary</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  ${Number(careerProgression.earningPotential.currentSalary || 0).toLocaleString()}
                </Typography>
                {careerProgression.earningPotential.currentSalarySource && (
                  <Typography variant="caption" sx={{ color: '#e2e8f0', mt: 0.5, display: 'block' }}>
                    Source: {careerProgression.earningPotential.currentSalarySource.includes('compensation_history') 
                      ? 'Compensation History' 
                      : 'Most Recent Offer'}
                  </Typography>
                )}
              </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>
                      Average Growth Rate
                      {careerProgression.earningPotential.isEstimated && (
                        <Chip 
                          label="Estimated" 
                          size="small" 
                          sx={{ ml: 1, height: '20px', fontSize: '0.7rem' }}
                          color="info"
                        />
                      )}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                      {(Number(careerProgression.earningPotential.avgGrowthRate) || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#cbd5e1', mb: 1 }}>Projected Earnings</Typography>
                    <Box sx={{ p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1, mb: 1, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                        <strong style={{ color: '#c4b5fd' }}>1 Year:</strong> ${Number(careerProgression.earningPotential.projected1Year || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1, mb: 1, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                        <strong style={{ color: '#c4b5fd' }}>3 Years:</strong> ${Number(careerProgression.earningPotential.projected3Years || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                        <strong style={{ color: '#c4b5fd' }}>5 Years:</strong> ${Number(careerProgression.earningPotential.projected5Years || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Career Inflection Points</Typography>
                  {careerProgression.earningPotential.inflectionPoints.length > 0 ? (
                    <Box>
                      {careerProgression.earningPotential.inflectionPoints.map((point, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5eead4', mb: 0.5 }}>
                            Major Salary Jump
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.875rem', mb: 0.5 }}>
                            {point.fromLevel} → {point.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#5eead4', fontWeight: 700 }}>
                            +{(Number(point.salaryIncrease) || 0).toFixed(1)}% increase
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#e2e8f0', fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                            {new Date(point.startDate).toLocaleDateString()} - {new Date(point.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                      No major inflection points detected
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Box className="statistics-card" sx={{ mt: 3 }}>
            <Box className="statistics-card-content">
              <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Role Progression Path</Typography>
              {careerProgression.progression.length > 0 ? (
                <Box>
                  {careerProgression.progression.map((role, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#c4b5fd' }}>
                            {role.role_title} at {role.company}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                            Level: {role.role_level || 'N/A'} • {role.start_date ? (() => {
                              try {
                                const date = new Date(role.start_date);
                                return isNaN(date.getTime()) ? role.start_date : date.toLocaleDateString();
                              } catch {
                                return role.start_date;
                              }
                            })() : 'N/A'}
                          </Typography>
                        </Box>
                        {(Number(role.salaryJump) || 0) > 0 && (
                          <Chip 
                            label={`+${(Number(role.salaryJump) || 0).toFixed(1)}%`} 
                            color="success" 
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1, color: '#e2e8f0' }}>
                        Base: ${Number(role.base_salary_start || 0).toLocaleString()} • 
                        Total Comp: ${Number(role.total_comp_start || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                  No career progression data
                </Typography>
              )}
            </Box>
          </Box>
        </TabPanel>

        {/* Tab 6: Strategy & Recommendations */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" sx={{ mb: 3, color: '#ffffff', fontWeight: 700, fontSize: '1.5rem' }}>Strategic Recommendations</Typography>
          {recommendations.length > 0 ? (
            <Box>
              {recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </Box>
          ) : (
            <Box className="statistics-card">
              <Box className="statistics-card-content">
                <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                  No recommendations available. Continue tracking offers and negotiations to get personalized insights.
                </Typography>
              </Box>
            </Box>
          )}
        </TabPanel>

        {/* Tab 7: Job vs Offer Comparison */}
        <TabPanel value={tabValue} index={7}>
          {jobSalaryAnalysis.totalJobsWithSalary === 0 && salaryComparison.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#e2e8f0' }}>
                No Job Salary Data Available
              </Typography>
              <Typography variant="body2">
                To see job vs offer comparisons, you need to:
                <br />1. Add jobs with salary ranges (salary_min and salary_max) in your job applications
                <br />2. Create offers and link them to those jobs (using job_id)
                <br />3. The system will automatically compare expected vs actual salaries
              </Typography>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Job Salary Analysis</Typography>
                  {jobSalaryAnalysis.totalJobsWithSalary > 0 ? (
                    <>
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1 }}>
                          Jobs with Salary Data
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#60a5fa' }}>
                          {jobSalaryAnalysis.totalJobsWithSalary}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1 }}>
                          Average Salary Range (from job postings)
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#ffffff' }}>
                          ${jobSalaryAnalysis.avgSalaryMin > 0 
                            ? `${Math.round(jobSalaryAnalysis.avgSalaryMin).toLocaleString()} - $${Math.round(jobSalaryAnalysis.avgSalaryMax).toLocaleString()}`
                            : 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                          Mid-point: ${jobSalaryAnalysis.avgSalaryRange > 0 
                            ? Math.round(jobSalaryAnalysis.avgSalaryRange).toLocaleString() 
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1 }}>
                          Jobs Converted to Offers
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                          {jobSalaryAnalysis.jobsWithOffers} with offers • {jobSalaryAnalysis.jobsWithoutOffers} without offers
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#e2e8f0', textAlign: 'center', py: 4 }}>
                      No jobs with salary data found. Add salary_min and salary_max to your job applications.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box className="statistics-card">
                <Box className="statistics-card-content">
                  <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Salary Comparison</Typography>
                  {salaryComparison.length > 0 ? (
                    <Box>
                      {salaryComparison.map((comp, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'rgba(139, 92, 246, 0.1)', borderRadius: 1, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#c4b5fd' }}>
                            {comp.company} - {comp.jobTitle}
                          </Typography>
                          <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                            <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                              <strong style={{ color: '#c4b5fd' }}>Job Range:</strong> ${comp.jobSalaryRange.min.toLocaleString()} - ${comp.jobSalaryRange.max.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                              <strong style={{ color: '#c4b5fd' }}>Actual Offer:</strong> ${comp.actualOffer.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box mt={1}>
                            <Chip
                              label={comp.withinRange 
                                ? `Within Range (${(Number(comp.differencePercent) || 0) > 0 ? '+' : ''}${(Number(comp.differencePercent) || 0).toFixed(1)}%)`
                                : (Number(comp.actualOffer) || 0) > (Number(comp.jobSalaryRange.max) || 0)
                                ? `Above Range (+${(Number(comp.differencePercent) || 0).toFixed(1)}%)`
                                : `Below Range (${(Number(comp.differencePercent) || 0).toFixed(1)}%)`}
                              size="small"
                              color={comp.withinRange ? 'success' : (Number(comp.actualOffer) || 0) > (Number(comp.jobSalaryRange.max) || 0) ? 'info' : 'warning'}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 2 }}>
                        {jobSalaryAnalysis.totalJobsWithSalary > 0
                          ? "No offers yet for jobs with salary data."
                          : "No salary comparison data available."}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                        {jobSalaryAnalysis.totalJobsWithSalary > 0
                          ? "To see comparisons, create offers and link them to your jobs (set job_id when creating an offer)."
                          : "Add jobs with salary ranges (salary_min and salary_max) and create corresponding offers to see comparisons."}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          {salaryComparison.length > 0 && (
            <Box className="statistics-card" sx={{ mt: 3 }}>
              <Box className="statistics-card-content">
                <Typography variant="h6" sx={{ mb: 2, color: '#e2e8f0', fontWeight: 700 }}>Salary Comparison Chart</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salaryComparison.map(c => ({
                    company: c.company,
                    jobMid: c.jobSalaryRange.mid,
                    actualOffer: c.actualOffer
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                    <XAxis 
                      dataKey="company" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                      tick={{ fill: '#e2e8f0' }}
                    />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} tick={{ fill: '#e2e8f0' }} />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ backgroundColor: 'rgba(30, 27, 75, 0.95)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                    <Bar 
                      dataKey="jobMid" 
                      fill="#9ca3af" 
                      name="Job Range (Mid)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="actualOffer" 
                      fill="#3b82f6" 
                      name="Actual Offer"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          )}
        </TabPanel>

      {/* Add Role Dialog */}
      <Dialog 
        open={showAddRoleForm} 
        onClose={() => !addingRole && setShowAddRoleForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Past Role to Compensation History</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company *"
                  value={newRoleData.company}
                  onChange={(e) => setNewRoleData({ ...newRoleData, company: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Role Title *"
                  value={newRoleData.role_title}
                  onChange={(e) => setNewRoleData({ ...newRoleData, role_title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Role Level"
                  value={newRoleData.role_level}
                  onChange={(e) => setNewRoleData({ ...newRoleData, role_level: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="intern">Intern</MenuItem>
                  <MenuItem value="entry">Entry</MenuItem>
                  <MenuItem value="junior">Junior</MenuItem>
                  <MenuItem value="mid">Mid</MenuItem>
                  <MenuItem value="senior">Senior</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="principal">Principal</MenuItem>
                  <MenuItem value="lead">Lead</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="director">Director</MenuItem>
                  <MenuItem value="vp">VP</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date *"
                  type="date"
                  value={newRoleData.start_date}
                  onChange={(e) => setNewRoleData({ ...newRoleData, start_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Date (if past role)"
                  type="date"
                  value={newRoleData.end_date}
                  onChange={(e) => setNewRoleData({ ...newRoleData, end_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Starting Base Salary"
                  type="number"
                  value={newRoleData.base_salary_start}
                  onChange={(e) => setNewRoleData({ ...newRoleData, base_salary_start: e.target.value })}
                  helperText="Enter the salary when you started this role"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Starting Total Compensation"
                  type="number"
                  value={newRoleData.total_comp_start}
                  onChange={(e) => setNewRoleData({ ...newRoleData, total_comp_start: e.target.value })}
                  helperText="Base + bonus + equity + benefits"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Base Salary"
                  type="number"
                  value={newRoleData.base_salary_current}
                  onChange={(e) => setNewRoleData({ ...newRoleData, base_salary_current: e.target.value })}
                  helperText="Leave blank to use starting salary"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Current Total Compensation"
                  type="number"
                  value={newRoleData.total_comp_current}
                  onChange={(e) => setNewRoleData({ ...newRoleData, total_comp_current: e.target.value })}
                  helperText="Leave blank to use starting total comp"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="PTO Days"
                  type="number"
                  value={newRoleData.pto_days}
                  onChange={(e) => setNewRoleData({ ...newRoleData, pto_days: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Benefits Value ($)"
                  type="number"
                  value={newRoleData.benefits_value}
                  onChange={(e) => setNewRoleData({ ...newRoleData, benefits_value: e.target.value })}
                  helperText="Estimated annual value of health insurance, 401k match, etc."
                />
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> You can add past roles that don't have offers. This helps build a complete picture of your career progression.
                Only Company, Role Title, and Start Date are required.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddRoleForm(false)} disabled={addingRole}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddRole} 
            variant="contained" 
            disabled={addingRole}
            startIcon={addingRole ? <CircularProgress size={16} /> : null}
          >
            {addingRole ? 'Adding...' : 'Add Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

