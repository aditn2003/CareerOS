// src/components/charts/FunnelChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

export default function FunnelChart({ funnel = {} }) {
  const applied = funnel.applied || 0;
  const interview = funnel.interview || 0;
  const offer = funnel.offer || 0;
  
  // Calculate conversion rates
  const appliedToInterview = applied > 0 ? (interview / applied * 100).toFixed(1) : 0;
  const interviewToOffer = interview > 0 ? (offer / interview * 100).toFixed(1) : 0;
  const appliedToOffer = applied > 0 ? (offer / applied * 100).toFixed(1) : 0;
  
  // Identify bottlenecks (stages with < 20% conversion rate)
  const bottlenecks = [];
  if (applied > 0 && parseFloat(appliedToInterview) < 20) {
    bottlenecks.push({
      stage: "Application → Interview",
      rate: parseFloat(appliedToInterview),
      issue: "Low interview conversion. Consider improving resume tailoring or targeting better-fit roles."
    });
  }
  if (interview > 0 && parseFloat(interviewToOffer) < 30) {
    bottlenecks.push({
      stage: "Interview → Offer",
      rate: parseFloat(interviewToOffer),
      issue: "Low offer conversion. Focus on interview preparation and follow-up."
    });
  }
  
  const data = [
    { 
      stage: "Applied", 
      count: applied,
      conversionRate: "100%",
      color: "#3b82f6"
    },
    { 
      stage: "Interview", 
      count: interview,
      conversionRate: `${appliedToInterview}%`,
      color: parseFloat(appliedToInterview) < 20 ? "#ef4444" : "#10b981"
    },
    { 
      stage: "Offer", 
      count: offer,
      conversionRate: `${appliedToOffer}%`,
      color: parseFloat(appliedToOffer) < 3 ? "#ef4444" : "#10b981"
    },
  ];

  return (
    <div className="chart-box">
      <h3 className="text-lg font-semibold mb-2">📉 Funnel Conversion & Bottleneck Analysis</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="stage" type="category" width={80} />
          <Tooltip 
            formatter={(value, name, props) => {
              if (name === "count") {
                return [
                  `${value} applications`,
                  props.payload.stage === "Interview" 
                    ? `Conversion: ${props.payload.conversionRate} from Applied`
                    : props.payload.stage === "Offer"
                    ? `Conversion: ${props.payload.conversionRate} from Applied`
                    : "Starting point"
                ];
              }
              return [value, name];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList 
              dataKey="count" 
              position="right" 
              style={{ fill: '#374151', fontSize: '12px', fontWeight: '600' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Conversion Rates Display */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="text-gray-600">Applied → Interview</div>
          <div className="text-lg font-bold text-blue-600">{appliedToInterview}%</div>
          <div className="text-xs text-gray-500">
            {interview} of {applied}
          </div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="text-gray-600">Interview → Offer</div>
          <div className="text-lg font-bold text-green-600">{interviewToOffer}%</div>
          <div className="text-xs text-gray-500">
            {offer} of {interview}
          </div>
        </div>
        <div className="text-center p-2 bg-purple-50 rounded">
          <div className="text-gray-600">Overall Rate</div>
          <div className="text-lg font-bold text-purple-600">{appliedToOffer}%</div>
          <div className="text-xs text-gray-500">
            {offer} of {applied}
          </div>
        </div>
      </div>
      
      {/* Bottleneck Identification */}
      {bottlenecks.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Bottleneck Identified</h4>
          {bottlenecks.map((bottleneck, idx) => (
            <div key={idx} className="mb-2">
              <div className="font-medium text-yellow-900">
                {bottleneck.stage}: {bottleneck.rate}% conversion
              </div>
              <div className="text-sm text-yellow-700">{bottleneck.issue}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
