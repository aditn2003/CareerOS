import React, { useState } from "react";
import NetworkContacts from "../../components/NetworkContacts";
import ReferralRequests from "../../components/ReferralRequests";
import NetworkingEvents from "../../components/NetworkingEvents";
import "./NetworkLayout.css";

export default function NetworkLayout() {
  const [activeTab, setActiveTab] = useState("network");

  return (
    <div className="network-layout">
      <div className="network-header">
        <h1>🤝 Network & Relationships</h1>
        <p>Manage your professional network, referral requests, and networking events</p>
      </div>

      {/* Tab Navigation */}
      <div className="network-tabs-navigation">
        <button
          className={`network-tab-btn ${activeTab === "network" ? "active" : ""}`}
          onClick={() => setActiveTab("network")}
        >
          👥 Professional Network
        </button>
        <button
          className={`network-tab-btn ${activeTab === "referrals" ? "active" : ""}`}
          onClick={() => setActiveTab("referrals")}
        >
          🤝 Referrals
        </button>
        <button
          className={`network-tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          📅 Networking Events
        </button>
      </div>

      {/* Tab Contents */}
      <div className="network-content">
        {activeTab === "network" && <NetworkContacts />}
        {activeTab === "referrals" && <ReferralRequests />}
        {activeTab === "events" && <NetworkingEvents />}
      </div>
    </div>
  );
}
