import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchDashboardStats } from "../api";

// Chart components
import ApplicationsTrendChart from "./charts/ApplicationsTrendChart";
import FunnelChart from "./charts/FunnelChart";
import StageTimeChart from "./charts/StageTimeChart";
import GoalRing from "./charts/GoalRing";
import GoalsSettings from "./GoalsSettings";

export default function StatisticsDashboard({ token: incomingToken }) {
    const { token } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalsSettings, setShowGoalsSettings] = useState(false);

  // Set wide default date range to capture all jobs
  const [filters, setFilters] = useState({
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  });

  const comparison = stats?.industryComparison?.comparison || {};


  useEffect(() => {
    if (!token) {
      console.log('❌ No token available');
      return;
    }

    async function load() {
      try {
        setLoading(true);
        
        // Only send filters that have values
        const cleanFilters = {};
        if (filters.startDate) cleanFilters.startDate = filters.startDate;
        if (filters.endDate) cleanFilters.endDate = filters.endDate;
        
        console.log('🔍 Fetching stats with filters:', cleanFilters);
        
        const data = await fetchDashboardStats(token, cleanFilters);

        console.log("📊 RAW DASHBOARD DATA:", data);

        // Normalize for safety
        const safe = {
            keyMetrics: {
              total_applications: Number(data.keyMetrics?.total_applications) || 0,
              total_interviews: Number(data.keyMetrics?.total_interviews) || 0,
              total_offers: Number(data.keyMetrics?.total_offers) || 0,
            },
            timeToResponse: {
              avg_response_hours:
                Number(data.timeToResponse?.avg_response_hours) || 0,
            },
            trends: Array.isArray(data.trends) ? data.trends : [],
            funnel: {
              applied: Number(data.funnel?.applied) || 0,
              interview: Number(data.funnel?.interview) || 0,
              offer: Number(data.funnel?.offer) || 0,
            },
            avgTimeInStage: data.avgTimeInStage || [],
            goals: data.goals || {},
            actionableInsights: data.actionableInsights || [],
          
            // Industry comparison data
            industryComparison: data.industryComparison || {}
          };
          

        setStats(safe);
      } catch (err) {
        console.error("❌ Error loading stats:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, filters]);

  if (loading) return <div className="p-8 text-center">Loading performance stats...</div>;
  if (!stats) return <div className="p-8 text-center">No stats available</div>;

  return (
    <div className="stats-box p-6">
      <h2 className="text-xl font-bold mb-4">📈 Performance Dashboard</h2>

      {/* Date Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className="border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border p-2 rounded"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => setFilters({ startDate: "2020-01-01", endDate: "2030-12-31" })}
            className="border px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
          >
            Reset Dates
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Key Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            title="Applications Sent"
            value={stats.keyMetrics.total_applications}
            subtitle="Total applications submitted"
          />
          <Metric
            title="Interviews Scheduled"
            value={stats.keyMetrics.total_interviews}
            subtitle={`${stats.keyMetrics.total_applications > 0 
              ? ((stats.keyMetrics.total_interviews / stats.keyMetrics.total_applications) * 100).toFixed(1) 
              : 0}% conversion rate`}
          />
          <Metric 
            title="Offers Received" 
            value={stats.keyMetrics.total_offers}
            subtitle={`${stats.keyMetrics.total_applications > 0 
              ? ((stats.keyMetrics.total_offers / stats.keyMetrics.total_applications) * 100).toFixed(1) 
              : 0}% success rate`}
          />
          <Metric
            title="Avg Response Time"
            value={`${(stats.timeToResponse.avg_response_hours / 24).toFixed(1)} days`}
            subtitle={`${stats.timeToResponse.avg_response_hours.toFixed(1)} hours`}
          />
        </div>
      </div>

      {/* 📈 Weekly Trends */}
      <ApplicationsTrendChart data={stats.trends} />

      {/* 📉 Funnel */}
      <FunnelChart funnel={stats.funnel} />
      
      {/* 🔗 Navigation to Success Rate Analysis */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">📊 Application Success Rate Analysis</h3>
            <p className="text-sm text-black">
              View detailed success rates by industry, role type, company size, and more
            </p>
          </div>
          <a 
            href="/statistics?tab=success" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View Analysis →
          </a>
        </div>
      </div>

      {/* ⏱ Stage Time */}
      <StageTimeChart data={stats.avgTimeInStage} />

      {/* 🎯 Goals */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <h3 className="font-semibold text-lg">Goals Progress</h3>
        <button 
          onClick={() => setShowGoalsSettings(true)}
          className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Customize Goals
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GoalRing
          current={stats.keyMetrics.total_applications}
          target={stats.goals.monthlyApplications}
          label={`Monthly Apps (Target: ${stats.goals.monthlyApplications})`}
        />

        <GoalRing
        current={
            stats.keyMetrics.total_applications > 0
            ? stats.funnel.interview / stats.keyMetrics.total_applications
            : 0
        }
        target={stats.goals.interviewRateTarget}
        label={`Interview Rate (Target: ${Math.round(stats.goals.interviewRateTarget * 100)}%)`}
        isRate={true}
        />

        <GoalRing
        current={
            stats.keyMetrics.total_applications > 0
            ? stats.funnel.offer / stats.keyMetrics.total_applications
            : 0
        }
        target={stats.goals.offerRateTarget}
        label={`Offer Rate (Target: ${Math.round(stats.goals.offerRateTarget * 100)}%)`}
        isRate={true}
        />
      </div>

      {/* Goals Settings Modal */}
      {showGoalsSettings && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowGoalsSettings(false)}
        >
          <div className="relative">
            <button 
              onClick={() => setShowGoalsSettings(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 z-10"
            >
              X
            </button>
            <GoalsSettings />
          </div>
        </div>
      )}

      {/* Insights */}
      <h3 className="font-semibold text-lg mt-6 mb-2">🔎 Insights</h3>
      <ul className="list-disc ml-6">
        {stats.actionableInsights.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>

      {/* 📊 Industry Benchmarks Comparison */}
      <h3 className="font-semibold text-lg mt-6 mb-3">Industry Benchmark Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Interview Rate Comparison */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Interview Rate</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {comparison.interviewRate ? (comparison.interviewRate.user * 100).toFixed(1) : 0}%
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              comparison.interviewRate?.status === 'above' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {comparison.interviewRate?.status === 'above' ? '↑' : '↓'} vs {(comparison.interviewRate?.industry * 100 || 12).toFixed(0)}% avg
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Industry average: 12%
          </div>
        </div>

        {/* Offer Rate Comparison */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Offer Rate</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {comparison.offerRate ? (comparison.offerRate.user * 100).toFixed(1) : 0}%
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              comparison.offerRate?.status === 'above' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {comparison.offerRate?.status === 'above' ? '↑' : '↓'} vs {(comparison.offerRate?.industry * 100 || 3).toFixed(0)}% avg
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Industry average: 3%
          </div>
        </div>

        {/* Response Time Comparison */}
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {comparison.responseTime?.userDays ? comparison.responseTime.userDays.toFixed(1) : 'N/A'} days
            </span>
            <span className={`text-sm font-medium px-2 py-0.5 rounded ${
              comparison.responseTime?.status === 'above' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {comparison.responseTime?.status === 'above' ? '↑ Faster' : '↓ Slower'} than avg
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Industry average: 10 days
          </div>
        </div>
      </div>


    </div>
  );
}

function Metric({ title, value, subtitle }) {
  return (
    <div className="border p-4 bg-white shadow rounded hover:shadow-md transition-shadow">
      <div className="text-gray-600 text-sm font-medium mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
}