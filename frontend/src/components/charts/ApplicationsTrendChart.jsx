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
  const formatted = data.map((item) => ({
    week: new Date(item.week_start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    applications: Number(item.applications) || 0,
    interviews: Number(item.interviews) || 0,
    offers: Number(item.offers) || 0,
  }));

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
