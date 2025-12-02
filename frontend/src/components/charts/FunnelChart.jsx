// src/components/charts/FunnelChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FunnelChart({ funnel = {} }) {
  const data = [
    { stage: "Applied", count: funnel.applied || 0 },
    { stage: "Interview", count: funnel.interview || 0 },
    { stage: "Offer", count: funnel.offer || 0 },
  ];

  return (
    <div className="chart-box">
      <h3 className="text-lg font-semibold mb-2">📉 Funnel Conversion</h3>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="stage" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
