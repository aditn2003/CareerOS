// src/components/TeamDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTeam } from "../contexts/TeamContext";
import { api } from "../api";
import { FaUsers, FaChevronDown } from "react-icons/fa";
import "./TeamDropdown.css";

export default function TeamDropdown() {
  const { teamState, setSelectedTeam } = useTeam() || {};
  const { isMentor, teams, activeTeam } = teamState || {};
  const [allMentorTeams, setAllMentorTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load all teams for mentor (including member count)
  useEffect(() => {
    if (isMentor) {
      loadMentorTeams();
    }
  }, [isMentor]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const loadMentorTeams = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/team/mentor/all");
      setAllMentorTeams(data?.teams || []);
    } catch (err) {
      console.error("Failed to load mentor teams:", err);
      // Fallback to teams from context if API fails
      setAllMentorTeams(teams || []);
    } finally {
      setLoading(false);
    }
  };

  // Use allMentorTeams if available (has member count), otherwise use teams from context
  const availableTeams = allMentorTeams.length > 0 ? allMentorTeams : (teams || []);

  // Only show dropdown if mentor has more than one team
  if (!isMentor || availableTeams.length <= 1) {
    // If only one team, just show the team name (non-clickable)
    if (activeTeam?.name) {
      return (
        <div className="team-dropdown-container centered">
          <div className="team-dropdown-static">
            <FaUsers />
            <span>{activeTeam.name}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setIsOpen(false);
  };

  return (
    <div className="team-dropdown-container centered" ref={dropdownRef}>
      <button
        className="team-dropdown-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <FaUsers />
        <span>{activeTeam?.name || "Select Team"}</span>
        <FaChevronDown className={`team-dropdown-chevron ${isOpen ? "open" : ""}`} />
      </button>
      {isOpen && (
        <>
          <div 
            className="team-dropdown-backdrop" 
            onClick={() => setIsOpen(false)}
          />
          <div className="team-dropdown-menu">
            {availableTeams.map((team) => {
              const isSelected = activeTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  className={`team-dropdown-option ${isSelected ? "selected" : ""}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <span className="team-dropdown-option-name">{team.name}</span>
                  {team.memberCount !== undefined && (
                    <span className="team-dropdown-option-count">
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                    </span>
                  )}
                  {isSelected && (
                    <span className="team-dropdown-checkmark">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

