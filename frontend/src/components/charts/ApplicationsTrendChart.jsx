import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export default function ApplicationsTrendChart({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="chart-box">
        <h3 className="text-lg font-semibold mb-2">
          📈 Weekly Application / Interview / Offer Trend
        </h3>
        <p className="text-gray-500 text-center py-8">No trend data available</p>
      </div>
    );
  }

  const formatted = data
    .filter(item => item.week_start) // Filter out items without week_start
    .map((item) => {
      try {
        const weekStart = new Date(item.week_start);
        
        // Check if date is valid
        if (isNaN(weekStart.getTime())) {
          console.warn('Invalid date:', item.week_start);
          return null;
        }
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get end of week
        
        // Format as "Jan 1 - 7" or "Jan 1 - Jan 7" if different months
        const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
        const startDay = weekStart.getDate();
        const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
        const endDay = weekEnd.getDate();
        
        const weekLabel = startMonth === endMonth
          ? `${startMonth} ${startDay} - ${endDay}`
          : `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
        
        return {
          week: weekLabel,
          weekStart: weekStart.toISOString().split('T')[0], // For sorting
          applications: Number(item.applications) || 0,
          interviews: Number(item.interviews) || 0,
          offers: Number(item.offers) || 0,
        };
      } catch (error) {
        console.error('Error formatting date:', item.week_start, error);
        return null;
      }
    })
    .filter(item => item !== null) // Remove null entries
    .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart)); // Ensure chronological order

  return (
    <div className="chart-box">
      <h3 className="text-lg font-semibold mb-2">
        📈 Weekly Application / Interview / Offer Trend
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />

          {/* Applications */}
          <Line
            type="monotone"
            dataKey="applications"
            stroke="#4f46e5"
            strokeWidth={3}
            name="Applications"
          />

          {/* Interviews */}
          <Line
            type="monotone"
            dataKey="interviews"
            stroke="#10b981"
            strokeWidth={3}
            name="Interviews"
          />

          {/* Offers */}
          <Line
            type="monotone"
            dataKey="offers"
            stroke="#f59e0b"
            strokeWidth={3}
            name="Offers"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
