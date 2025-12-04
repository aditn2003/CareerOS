import React, { useState, useEffect } from "react";
import NetworkContacts from "../../components/NetworkContacts";
import ReferralRequests from "../../components/ReferralRequests";
import NetworkingEvents from "../../components/NetworkingEvents";
import InformationalInterviews from "../../components/InformationalInterviews";
import IndustryContactDiscovery from "../../components/IndustryContactDiscovery";
import RelationshipMaintenance from "../../components/RelationshipMaintenance";
import ProfessionalReferences from "../../components/ProfessionalReferences";
import "./NetworkLayout.css";

export default function NetworkLayout() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("networkLayoutActiveTab");
    return savedTab || "network";
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("networkLayoutActiveTab", activeTab);
  }, [activeTab]);

  return (
    <div className="network-layout">
      <div className="network-header">
        <h1>🤝 Network & Relationships</h1>
        <p>Manage your professional network, referral requests, networking events, industry contacts, and informational interviews</p>
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
        <button
          className={`network-tab-btn ${activeTab === "discovery" ? "active" : ""}`}
          onClick={() => setActiveTab("discovery")}
        >
          🌐 Industry Contacts
        </button>
        <button
          className={`network-tab-btn ${activeTab === "interviews" ? "active" : ""}`}
          onClick={() => setActiveTab("interviews")}
        >
          💼 Informational Interviews
        </button>
        <button
          className={`network-tab-btn ${activeTab === "maintenance" ? "active" : ""}`}
          onClick={() => setActiveTab("maintenance")}
        >
          💌 Relationship Maintenance
        </button>
        <button
          className={`network-tab-btn ${activeTab === "references" ? "active" : ""}`}
          onClick={() => setActiveTab("references")}
        >
          📋 References
        </button>
      </div>

      {/* Tab Contents */}
      <div className="network-content">
        {activeTab === "network" && <NetworkContacts />}
        {activeTab === "referrals" && <ReferralRequests />}
        {activeTab === "events" && <NetworkingEvents />}
        {activeTab === "discovery" && <IndustryContactDiscovery />}
        {activeTab === "interviews" && <InformationalInterviews />}
        {activeTab === "maintenance" && <RelationshipMaintenance />}
        {activeTab === "references" && <ProfessionalReferences />}
      </div>
    </div>
  );
}
