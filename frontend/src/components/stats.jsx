import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchDashboardStats } from "../api";

// Chart components
import ApplicationsTrendChart from "./charts/ApplicationsTrendChart";
import FunnelChart from "./charts/FunnelChart";
import StageTimeChart from "./charts/StageTimeChart";
import GoalRing from "./charts/GoalRing";

export default function StatisticsDashboard({ token: incomingToken }) {
    const { token } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set wide default date range to capture all jobs
  const [filters, setFilters] = useState({
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  });

  const benchmarks = stats?.industryBenchmarks || {};

const interviewRate = benchmarks.interviewRate != null
  ? (benchmarks.interviewRate * 100).toFixed(1)
  : "N/A";

const offerRate = benchmarks.offerRate != null
  ? (benchmarks.offerRate * 100).toFixed(1)
  : "N/A";

const responseHours = benchmarks.avgResponseHours ?? "N/A";

// -----------------------------
// 7️⃣ REAL INDUSTRY BENCHMARKS (BASED ON USER DATA)
// -----------------------------


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
          
            // 🚀 ADD THIS LINE
            industryBenchmarks: data.industryBenchmarks || {}
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

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric
          title="Applications"
          value={stats.keyMetrics.total_applications}
        />
        <Metric
          title="Interviews"
          value={stats.keyMetrics.total_interviews}
        />
        <Metric title="Offers" value={stats.keyMetrics.total_offers} />
        <Metric
          title="Avg Response (hrs)"
          value={stats.timeToResponse.avg_response_hours.toFixed(1)}
        />
      </div>

      {/* 📈 Weekly Trends */}
      <ApplicationsTrendChart data={stats.trends} />

      {/* 📉 Funnel */}
      <FunnelChart funnel={stats.funnel} />

      {/* ⏱ Stage Time */}
      <StageTimeChart data={stats.avgTimeInStage} />

      {/* 🎯 Goals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <GoalRing
          current={stats.keyMetrics.total_applications}
          target={stats.goals.monthlyApplications}
          label="Monthly Application Goal"
        />

        <GoalRing
        current={
            stats.keyMetrics.total_applications > 0
            ? stats.funnel.interview / stats.keyMetrics.total_applications
            : 0
        }
        target={stats.goals.interviewRateTarget}
        label="Interview Conversion Goal"
        isRate={true}
        />



        <GoalRing
        current={
            stats.keyMetrics.total_applications > 0
            ? stats.funnel.offer / stats.keyMetrics.total_applications
            : 0
        }
        target={stats.goals.offerRateTarget}
        label="Offer Conversion Goal"
        isRate={true}
        />


      </div>

      {/* Insights */}
      <h3 className="font-semibold text-lg mt-6 mb-2">🔎 Insights</h3>
      <ul className="list-disc ml-6">
        {stats.actionableInsights.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>

      {/* 📊 Industry Benchmarks */}
      <li>Average Interview Rate: <strong>{interviewRate}%</strong></li>
<li>Average Offer Rate: <strong>{offerRate}%</strong></li>
<li>Average Response Time: <strong>{responseHours} hrs</strong></li>


    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="border p-4 bg-white shadow rounded">
      <div className="text-gray-600 text-sm">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}