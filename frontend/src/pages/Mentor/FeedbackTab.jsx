// src/pages/Mentor/FeedbackTab.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useTeam } from "../../contexts/TeamContext";
import { api } from "../../api";
import FeedbackThreads from "../../components/FeedbackThreads";
import FeedbackModal from "../../components/FeedbackModal";
import TeamDropdown from "../../components/TeamDropdown";
import { FaUsers } from "react-icons/fa";
import "./FeedbackTab.css";

export default function FeedbackTab() {
  const { teamState } = useTeam() || {};
  const teamId = teamState?.activeTeam?.id;
  const teamName = teamState?.activeTeam?.name;
  const isMentor = teamState?.isMentor || teamState?.isAdmin;
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null); // { candidateId, candidateName }
  const [feedbackList, setFeedbackList] = useState([]);

  const loadMembers = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/members`);
      // Filter to show only candidates (mentors can give feedback to candidates)
      const candidateList = (data?.members || []).filter(
        (m) => m.role === "candidate" && m.status === "active"
      );
      setMembers(candidateList);
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [teamId]);

  const loadFeedback = useCallback(async () => {
    if (!teamId) {
      setFeedbackList([]);
      return;
    }
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      setFeedbackList(data?.feedback || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setFeedbackList([]);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadMembers();
      loadFeedback();
    }
  }, [teamId, loadMembers, loadFeedback]);

  if (!teamId) {
    return (
      <div className="feedback-tab-container">
        <div className="feedback-tab-empty">
          <FaUsers className="feedback-tab-empty-icon" />
          <h3 className="feedback-tab-empty-title">No Team Found</h3>
          <p className="feedback-tab-empty-text">
            Please join a team to view and manage feedback.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-tab-container">
      <div className="feedback-tab-header">
        <h2 className="feedback-tab-title">Feedback Management</h2>
        <p className="feedback-tab-subtitle">
          Build meaningful connections through constructive feedback
        </p>
        <div style={{ marginTop: "12px" }}>
          <TeamDropdown />
        </div>
      </div>

      <div className="feedback-tab-content">
        <FeedbackThreads 
          teamId={teamId} 
          onAddFeedback={(candidateId, candidateName) => {
            setFeedbackModal({
              candidateId,
              candidateName,
            });
          }}
        />
      </div>

      {/* Feedback Modal */}
      {feedbackModal && teamId && (
        <FeedbackModal
          teamId={teamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          onClose={() => setFeedbackModal(null)}
          onSuccess={() => {
            loadFeedback();
            setFeedbackModal(null);
          }}
        />
      )}
    </div>
  );
}

