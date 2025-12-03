import React, { useState, useEffect } from "react";
import { getComprehensiveCompensationAnalytics, recalculateCompetingOffers, getOffers, autoFetchBenchmarkForOffer, acceptOffer, createCompensationHistory, deleteCompensationHistory } from "../api";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  Paper,
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
function KPICard({ title, value, subtitle, color = '#3b82f6' }) {
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color, mt: 1, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#9ca3af', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }) {
  const colorMap = {
    warning: '#f59e0b',
    info: '#3b82f6',
    success: '#10b981',
    error: '#ef4444'
  };
  
  const bgColorMap = {
    warning: '#fffbeb',
    info: '#eff6ff',
    success: '#f0fdf4',
    error: '#fef2f2'
  };
  
  return (
    <Card sx={{ 
      mb: 2, 
      backgroundColor: bgColorMap[recommendation.type] || '#f9fafb',
      borderLeft: `4px solid ${colorMap[recommendation.type] || '#6b7280'}`
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {recommendation.title}
          </Typography>
          <Chip 
            label={recommendation.priority} 
            size="small" 
            color={recommendation.priority === 'high' ? 'error' : recommendation.priority === 'medium' ? 'warning' : 'default'}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#374151', mb: 1 }}>
          {recommendation.message}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic' }}>
          {recommendation.action}
        </Typography>
      </CardContent>
    </Card>
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
      
      // Validate response data
      if (!res || !res.data) {
        throw new Error("Invalid response from server");
      }
      
      setData(res.data);
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
      accepted: offerTracking.acceptedVsRejected?.accepted,
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

  const roleLevelData = Object.entries(offerTracking.byLevel || {})
    .map(([level, data]) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      avgSalary: data.avgBase,
      count: data.count
    }))
    .sort((a, b) => b.avgSalary - a.avgSalary);

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
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            💼 Comprehensive Compensation Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Track your salary progression, negotiation success, market positioning, and career growth
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
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
            sx={{ minWidth: '140px' }}
            size="small"
          >
            🔍 Recalc Competing
          </Button>
          <Button
            variant="outlined"
            onClick={loadData}
            disabled={loading}
            sx={{ minWidth: '120px' }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, width: '100%', overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            width: '100%',
            overflowX: 'auto',
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              minHeight: '56px',
            },
            '& .Mui-selected': {
              color: '#3b82f6',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#3b82f6',
              height: 3,
            },
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 }
            },
            '& .MuiTabs-scroller': {
              overflowX: 'auto !important'
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Salary & Offers" />
          <Tab label="Negotiation Analytics" />
          <Tab label="Market Comparison" />
          <Tab label="Compensation Evolution" />
          <Tab label="Career Progression" />
          <Tab label="Strategy & Recommendations" />
          <Tab label="Location & Industry" />
          <Tab label="Job vs Offer Comparison" />
        </Tabs>

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
                  ? `${offerTracking.acceptedVsRejected.accepted} accepted` 
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
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offer Status Distribution</Typography>
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
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={60}
                          iconType="circle"
                          wrapperStyle={{ paddingTop: '20px' }}
                          style={{ fontSize: '14px', wordWrap: 'break-word' }}
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
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No offer data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Average Salary by Role Level</Typography>
                  {roleLevelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={roleLevelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                        <Bar dataKey="avgSalary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No role level data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab 1: Salary & Offer Tracking */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offers by Role</Typography>
                  {Object.keys(offerTracking.byRole || {}).length > 0 ? (
                    <Box>
                      {Object.entries(offerTracking.byRole)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([role, data]) => (
                          <Box key={role} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{role}</Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {data.count} offer(s) • Avg: ${data.avgBase.toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No role data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Offers by Location</Typography>
                  {Object.keys(offerTracking.byLocation || {}).length > 0 ? (
                    <Box>
                      {Object.entries(offerTracking.byLocation)
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([location, data]) => (
                          <Box key={location} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{location}</Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {data.count} offer(s) • Avg: ${data.avgBase.toLocaleString()}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No location data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Outcomes</Typography>
                  {offerTracking.negotiationOutcomes.length > 0 ? (
                    <Box>
                      {offerTracking.negotiationOutcomes.slice(0, 5).map((outcome, idx) => {
                        const improvement = Number(outcome.improvement) || 0;
                        return (
                          <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{outcome.company || 'Unknown'}</Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {outcome.role || 'Unknown Role'} • +{improvement.toFixed(1)}%
                            </Typography>
                            <Chip 
                              label={outcome.outcome || 'unknown'} 
                              size="small" 
                              color={outcome.outcome === 'success' ? 'success' : 'default'}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>No negotiation data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Competing Offers</Typography>
              {offerTracking.competingOffers > 0 && offerTracking.competingOffersDetails ? (
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                    You have {offerTracking.competingOffers} offer(s) with competing offers, which can strengthen your negotiation position.
                  </Typography>
                  {offerTracking.competingOffersDetails.map((offerGroup, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1, border: '1px solid #10b981' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#059669' }}>
                        {offerGroup.company} - {offerGroup.role}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                        <strong>Salary:</strong> ${offerGroup.salary.toLocaleString()}
                      </Typography>
                      {offerGroup.competingOffers && offerGroup.competingOffers.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 1 }}>
                            Competing with {offerGroup.competingCount} offer(s):
                          </Typography>
                          {offerGroup.competingOffers.map((competing, compIdx) => (
                            <Box key={compIdx} sx={{ 
                              ml: 2, 
                              mb: 0.5, 
                              p: 1, 
                              bgcolor: 'white', 
                              borderRadius: '4px',
                              border: '1px solid #d1d5db'
                            }}>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                <strong>{competing.company}</strong> - {competing.role}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>
                                ${competing.salary.toLocaleString()}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                    No competing offers detected yet.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                    Competing offers are automatically detected when you have multiple offers with salaries within $5,000 of each other.
                    <br />
                    <br />
                    <strong>Tip:</strong> Click "🔍 Recalc Competing" in the header to recalculate for existing offers.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 2: Negotiation Analytics */}
        <TabPanel value={tabValue} index={2}>
          {negotiationAnalytics.successRate === 0 && Object.keys(negotiationAnalytics.trendsOverTime || {}).length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No negotiation data available
              </Typography>
              <Typography variant="body2">
                To see negotiation analytics, you need to:
                <br />1. Create offers with base salaries
                <br />2. Update offers with higher salaries (negotiated amounts)
                <br />3. Add negotiation notes in the offer form
              </Typography>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Success Metrics</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Success Rate</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981' }}>
                          {(Number(negotiationAnalytics.successRate) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Avg Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {(Number(negotiationAnalytics.avgImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Median Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                          {(Number(negotiationAnalytics.medianImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ p: 2, bgcolor: '#fce7f3', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Max Improvement</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#ec4899' }}>
                          {(Number(negotiationAnalytics.maxImprovement) || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Trends Over Time</Typography>
                  {negotiationTrendsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={negotiationTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
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
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No negotiation trends data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Negotiation Success by Context</Typography>
              {contextMetricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={contextMetricsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="context" width={150} />
                    <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="successRate" fill="#10b981" name="Success Rate %" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgImprovement" fill="#3b82f6" name="Avg Improvement %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No context-based negotiation data
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 3: Market Comparison */}
        <TabPanel value={tabValue} index={3}>
          {marketComparisons.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                No market comparison data available
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Market comparisons require benchmark data in the database. Currently, there are no market benchmarks configured.
                <br />
                <br />
                <strong>✨ Quick Solution:</strong> Use AI to automatically fetch market benchmarks for all your offers!
                <br />
                <br />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleFetchBenchmarks}
                  disabled={fetchingBenchmarks || loading}
                  sx={{ mt: 1 }}
                  startIcon={fetchingBenchmarks ? <CircularProgress size={16} /> : null}
                >
                  {fetchingBenchmarks 
                    ? `Fetching... (${benchmarkProgress.current}/${benchmarkProgress.total})`
                    : 'Fetch Market Benchmarks with AI'
                  }
                </Button>
                {fetchingBenchmarks && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                      Fetching benchmarks for your offers using Google Gemini AI...
                    </Typography>
                    <Box sx={{ width: '100%', bgcolor: '#e5e7eb', borderRadius: 1, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          height: 8, 
                          bgcolor: '#3b82f6',
                          width: `${(benchmarkProgress.current / benchmarkProgress.total) * 100}%`,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#6b7280', mt: 0.5 }}>
                      {benchmarkProgress.current} of {benchmarkProgress.total} offers processed
                    </Typography>
                  </Box>
                )}
                <Typography variant="body2" sx={{ mt: 2, color: '#6b7280' }}>
                  <strong>Manual Option:</strong> You can also manually add market benchmark data to the <code>market_benchmarks</code> table in your database.
                </Typography>
              </Typography>
            </Alert>
          ) : null}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Market Position Summary</Typography>
                  {marketComparisons.length > 0 ? (
                    <Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#fef2f2', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                          Under Market: {marketComparisons.filter(m => m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                          At/Above Market: {marketComparisons.filter(m => !m.isUnderpaid).length}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: '#fffbeb', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                          Significantly Under: {marketComparisons.filter(m => m.significantlyUnderpaid).length}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No market comparison data available. Add market benchmarks to compare your offers.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Percentile Distribution</Typography>
                  {marketComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart 
                        data={marketComparisonData}
                        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="company" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          label={{ value: 'Percentile', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                          width={60}
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
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                        <Scatter 
                          dataKey="percentile" 
                          fill="#3b82f6"
                          name="Percentile"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No percentile data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Detailed Market Comparisons</Typography>
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
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, fontStyle: 'italic' }}>
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
                      <Box key={comp.offerId || idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1, border: '1px solid #e5e7eb' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {comp.company} - {comp.role}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6b7280' }}>
                              {comp.level || 'N/A'} • {comp.location || 'N/A'}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${percentile.toFixed(1)}th percentile`}
                            color={comp.isUnderpaid ? 'error' : comp.isOverpaid ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                        <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                          <Typography variant="body2">
                            <strong>Your Salary:</strong> ${yourSalary.toLocaleString()}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Market Median:</strong> ${marketMedian.toLocaleString()}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: difference < 0 ? '#dc2626' : '#16a34a',
                              fontWeight: 600
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
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No market comparison data available. Fetch benchmarks for your offers to see comparisons.
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 4: Compensation Evolution */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Compensation Evolution</Typography>
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
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
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
                            <Card key={offer.id} sx={{ mb: 2, border: '1px solid #e5e7eb' }}>
                              <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {offer.company} - {offer.role_title}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                                      {offer.role_level} • {offer.location}
                                    </Typography>
                                    <Typography variant="body2">
                                      <strong>Base Salary:</strong> ${Number(offer.base_salary || 0).toLocaleString()}
                                      {offer.total_comp_year1 && (
                                        <> • <strong>Total Comp:</strong> ${Number(offer.total_comp_year1).toLocaleString()}</>
                                      )}
                                    </Typography>
                                  </Box>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleAcceptOffer(offer.id)}
                                    sx={{ ml: 2 }}
                                  >
                                    Accept Offer
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          ))
                      ) : (
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          No pending offers. Create offers from your job applications to accept them.
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Alert>
          ) : null}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Compensation Timeline</Typography>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => new Date(v).getFullYear()}
                    />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                    />
                    <Legend />
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
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No compensation history data
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Milestones & Achievements */}
          {compensationEvolution.milestones && compensationEvolution.milestones.length > 0 && (
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: 'white', fontWeight: 700 }}>
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
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1f2937', mb: 0.5 }}>
                            {title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4b5563', mb: 1, fontSize: '0.85rem' }}>
                            {description}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                            {milestone.value ? `$${Number(milestone.value).toLocaleString()}` : ''} • {new Date(milestone.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* All Roles List with Delete Option */}
          {compensationEvolution.timeline.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>All Roles in Compensation History</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  Manage your compensation history. You can remove roles that are no longer relevant.
                </Typography>
                <Box>
                  {compensationEvolution.timeline.map((role, idx) => {
                    const isActive = !role.end_date || new Date(role.end_date) >= new Date();
                    return (
                      <Card 
                        key={role.id || idx} 
                        variant="outlined" 
                        sx={{ 
                          mb: 2, 
                          p: 2,
                          bgcolor: isActive ? '#f0fdf4' : '#f9fafb',
                          borderLeft: `4px solid ${isActive ? '#10b981' : '#9ca3af'}`
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box sx={{ flex: 1 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {role.role_title} at {role.company}
                              </Typography>
                              {isActive && (
                                <Chip label="Active" size="small" color="success" />
                              )}
                              {role.end_date && (
                                <Chip label="Past" size="small" color="default" />
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                              Level: {role.role_level || 'N/A'} • 
                              Start: {role.start_date ? new Date(role.start_date).toLocaleDateString() : 'N/A'}
                              {role.end_date && ` • End: ${new Date(role.end_date).toLocaleDateString()}`}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Base Salary:</strong> ${Number(role.base_salary_current || role.base_salary_start || 0).toLocaleString()} • 
                              <strong> Total Comp:</strong> ${Number(role.total_comp_current || role.total_comp_start || 0).toLocaleString()}
                            </Typography>
                          </Box>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDeleteRole(role.id, role.company, role.role_title)}
                            disabled={deletingRoleId === role.id}
                            sx={{ ml: 2 }}
                          >
                            {deletingRoleId === role.id ? (
                              <>
                                <CircularProgress size={16} sx={{ mr: 1 }} />
                                Deleting...
                              </>
                            ) : (
                              '🗑️ Remove'
                            )}
                          </Button>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Growth Phases</Typography>
                  {compensationEvolution.growthPhases.length > 0 ? (
                    <Box>
                      {compensationEvolution.growthPhases.map((phase, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {phase.fromLevel} → {phase.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {(Number(phase.salaryIncrease) || 0).toFixed(1)}% increase • {(Number(phase.annualizedIncrease) || 0).toFixed(1)}% annualized
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No significant growth phases detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Plateau Periods</Typography>
                  {compensationEvolution.plateaus.length > 0 ? (
                    <Box>
                      {compensationEvolution.plateaus.map((plateau, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#fffbeb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Plateau Detected
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {(Number(plateau.durationYears) || 0).toFixed(1)} years • {(Number(plateau.annualizedIncrease) || 0).toFixed(1)}% annualized growth
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(plateau.startDate).toLocaleDateString()} - {new Date(plateau.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No plateau periods detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
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
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Earning Potential</Typography>
                  {careerProgression.earningPotential.isEstimated && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="caption">
                        Using industry-standard growth rate estimates. Add more roles to your compensation history for personalized projections.
                      </Typography>
                    </Alert>
                  )}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>Current Salary</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  ${Number(careerProgression.earningPotential.currentSalary || 0).toLocaleString()}
                </Typography>
                {careerProgression.earningPotential.currentSalarySource && (
                  <Typography variant="caption" sx={{ color: '#9ca3af', mt: 0.5, display: 'block' }}>
                    Source: {careerProgression.earningPotential.currentSalarySource.includes('compensation_history') 
                      ? 'Compensation History' 
                      : 'Most Recent Offer'}
                  </Typography>
                )}
              </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
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
                    <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>Projected Earnings</Typography>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2">
                        <strong>1 Year:</strong> ${Number(careerProgression.earningPotential.projected1Year || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1, mb: 1 }}>
                      <Typography variant="body2">
                        <strong>3 Years:</strong> ${Number(careerProgression.earningPotential.projected3Years || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>5 Years:</strong> ${Number(careerProgression.earningPotential.projected5Years || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Career Inflection Points</Typography>
                  {careerProgression.earningPotential.inflectionPoints.length > 0 ? (
                    <Box>
                      {careerProgression.earningPotential.inflectionPoints.map((point, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Major Salary Jump
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {point.fromLevel} → {point.toLevel}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>
                            +{(Number(point.salaryIncrease) || 0).toFixed(1)}% increase
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            {new Date(point.startDate).toLocaleDateString()} - {new Date(point.endDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No major inflection points detected
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Role Progression Path</Typography>
              {careerProgression.progression.length > 0 ? (
                <Box>
                  {careerProgression.progression.map((role, idx) => (
                    <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {role.role_title} at {role.company}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
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
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Base: ${Number(role.base_salary_start || 0).toLocaleString()} • 
                        Total Comp: ${Number(role.total_comp_start || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No career progression data
                </Typography>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 6: Strategy & Recommendations */}
        <TabPanel value={tabValue} index={6}>
          <Typography variant="h6" sx={{ mb: 3 }}>Strategic Recommendations</Typography>
          {recommendations.length > 0 ? (
            <Box>
              {recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </Box>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                  No recommendations available. Continue tracking offers and negotiations to get personalized insights.
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* Tab 7: Location & Industry Positioning */}
        <TabPanel value={tabValue} index={7}>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Location Positioning</Typography>
                  {locationPositioning.length > 0 ? (
                    <Box>
                      {locationPositioning.map((loc, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {loc.location}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Type: {loc.locationType} • {loc.offers.length} offer(s)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                            Avg Salary: ${loc.avgSalary.toLocaleString()}
                          </Typography>
                          {loc.colIndex && (
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                              COL Index: {loc.colIndex}
                            </Typography>
                          )}
                          {loc.marketComparisons.length > 0 && (
                            <Box mt={1}>
                              <Chip 
                                label={`${loc.marketComparisons.filter(m => !m.isUnderpaid).length}/${loc.marketComparisons.length} at/above market`}
                                size="small"
                                color={loc.marketComparisons.filter(m => !m.isUnderpaid).length === loc.marketComparisons.length ? 'success' : 'default'}
                              />
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No location data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Industry Positioning</Typography>
                  {industryPositioning.length > 0 ? (
                    <Box>
                      {industryPositioning.map((ind, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {ind.industry}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {ind.offers.length} offer(s)
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                            Avg Salary: ${ind.avgSalary.toLocaleString()}
                          </Typography>
                          {ind.marketComparisons.length > 0 && (
                            <Box mt={1}>
                              <Chip 
                                label={`${ind.marketComparisons.filter(m => !m.isUnderpaid).length}/${ind.marketComparisons.length} at/above market`}
                                size="small"
                                color={ind.marketComparisons.filter(m => !m.isUnderpaid).length === ind.marketComparisons.length ? 'success' : 'default'}
                              />
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      No industry data
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Location vs Industry Analysis</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Compare your compensation across different locations and industries to identify the best opportunities for your career growth.
                Use cost of living adjustments to normalize salaries across different markets.
              </Typography>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tab 8: Job vs Offer Comparison */}
        <TabPanel value={tabValue} index={8}>
          {jobSalaryAnalysis.totalJobsWithSalary === 0 && salaryComparison.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
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
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Job Salary Analysis</Typography>
                  {jobSalaryAnalysis.totalJobsWithSalary > 0 ? (
                    <>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                          Jobs with Salary Data
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                          {jobSalaryAnalysis.totalJobsWithSalary}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                          Average Salary Range (from job postings)
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          ${jobSalaryAnalysis.avgSalaryMin > 0 
                            ? `${Math.round(jobSalaryAnalysis.avgSalaryMin).toLocaleString()} - $${Math.round(jobSalaryAnalysis.avgSalaryMax).toLocaleString()}`
                            : 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                          Mid-point: ${jobSalaryAnalysis.avgSalaryRange > 0 
                            ? Math.round(jobSalaryAnalysis.avgSalaryRange).toLocaleString() 
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
                          Jobs Converted to Offers
                        </Typography>
                        <Typography variant="body2">
                          {jobSalaryAnalysis.jobsWithOffers} with offers • {jobSalaryAnalysis.jobsWithoutOffers} without offers
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', py: 4 }}>
                      No jobs with salary data found. Add salary_min and salary_max to your job applications.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Salary Comparison</Typography>
                  {salaryComparison.length > 0 ? (
                    <Box>
                      {salaryComparison.map((comp, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {comp.company} - {comp.jobTitle}
                          </Typography>
                          <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                            <Typography variant="body2">
                              <strong>Job Range:</strong> ${comp.jobSalaryRange.min.toLocaleString()} - ${comp.jobSalaryRange.max.toLocaleString()}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Actual Offer:</strong> ${comp.actualOffer.toLocaleString()}
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
                      <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                        {jobSalaryAnalysis.totalJobsWithSalary > 0
                          ? "No offers yet for jobs with salary data."
                          : "No salary comparison data available."}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {jobSalaryAnalysis.totalJobsWithSalary > 0
                          ? "To see comparisons, create offers and link them to your jobs (set job_id when creating an offer)."
                          : "Add jobs with salary ranges (salary_min and salary_max) and create corresponding offers to see comparisons."}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {salaryComparison.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Salary Comparison Chart</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salaryComparison.map(c => ({
                    company: c.company,
                    jobMid: c.jobSalaryRange.mid,
                    actualOffer: c.actualOffer
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="company" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                    />
                    <YAxis tickFormatter={(v) => `$${v/1000}k`} />
                    <Tooltip 
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
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
              </CardContent>
            </Card>
          )}
        </TabPanel>
      </Paper>

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

