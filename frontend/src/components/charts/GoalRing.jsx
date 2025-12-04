import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function GoalRing({ current, target, label, isRate = false }) {
  // percent of the goal achieved
  const percent = target > 0 ? (current / target) * 100 : 0;

  // What number we want to show below the chart
  const displayValue = isRate
    ? (current * 100).toFixed(1) + "%"      // show actual rate
    : percent.toFixed(1) + "%";            // show progress %

  const data = [
    { name: "progress", value: percent },
    { name: "remaining", value: Math.max(0, 100 - percent) },
  ];

  return (
    <div className="chart-box text-center">
      <h3 className="text-lg font-semibold mb-2">{label}</h3>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            <Cell fill="#6366f1" />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* USE displayValue — not percent */}
      <p className="font-bold text-xl">{displayValue}</p>
    </div>
  );
}
