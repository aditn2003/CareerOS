// src/components/charts/StageTimeChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function StageTimeChart({ data = [] }) {
  const formatted = data.map((item) => ({
    status: item.status || "Unknown",
    days: Number(item.avg_days) || 0,
  }));

  return (
    <div className="chart-box">
      <h3 className="text-lg font-semibold mb-2">⏱ Avg Time in Stage (days)</h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="days" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
