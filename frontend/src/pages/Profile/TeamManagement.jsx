import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import CandidateProfileModal from "../../components/CandidateProfileModal";
import FeedbackModal from "../../components/FeedbackModal";
import FeedbackThreads from "../../components/FeedbackThreads";
import "./TeamManagement.css";

const errorMessages = {
  ALREADY_MEMBER: "That person is already in this team.",
  USER_NOT_FOUND: "We can't invite that email because no account exists yet.",
  EMAIL_REQUIRED: "Please enter an email before sending an invite.",
  FORBIDDEN: "You don't have permission to manage this team.",
  MENTOR_ALREADY_IN_TEAM: "This mentor is already part of another team.",
  TEAM_NAME_REQUIRED: "Please enter a team name.",
  CANNOT_REMOVE_ADMIN: "Only admins can remove other admins.",
  ONLY_CANDIDATES_CAN_LEAVE: "Only candidates can leave a team themselves.",
  MENTOR_CANNOT_REMOVE_SELF: "Mentors cannot remove themselves. Please ask an admin to remove you.",
};

// ============================================================
// ADMIN VIEW: Manage all teams
// ============================================================
function AdminTeamManagement() {
  const { refreshTeam } = useTeam();
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: null, message: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("candidate");
  const [busyMember, setBusyMember] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [renamingTeamId, setRenamingTeamId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackViewMode, setFeedbackViewMode] = useState("list"); // "list" or "threads"

  const showBanner = (type, message) => {
    if (!message) return;
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: null, message: "" }), 5000);
  };

  const loadAllTeams = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/team/admin/all");
      setAllTeams(data?.teams || []);
      if (data?.teams?.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data.teams[0].id);
      }
    } catch (err) {
      showBanner("error", "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  const loadMembers = useCallback(
    async (teamId) => {
      if (!teamId) {
        setMembers([]);
        return;
      }
      try {
        const { data } = await api.get(`/api/team/${teamId}/members`);
        setMembers(data?.members || []);
      } catch (err) {
        showBanner("error", "Failed to load members.");
      }
    },
    []
  );

  const loadPendingRequests = useCallback(
    async (teamId) => {
      if (!teamId) {
        setPendingRequests([]);
        return;
      }
      setLoadingRequests(true);
      try {
        const { data } = await api.get(`/api/team/${teamId}/pending-requests`);
        setPendingRequests(data?.requests || []);
      } catch (err) {
        // Silent fail - not all users can view requests
        setPendingRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    },
    []
  );

  const loadFeedback = useCallback(async (teamId) => {
    if (!teamId) {
      setFeedbackList([]);
      return;
    }
    setLoadingFeedback(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      console.log(`[Feedback] Loaded ${data?.feedback?.length || 0} feedback entries for team ${teamId}`);
      setFeedbackList(data?.feedback || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setFeedbackList([]);
    } finally {
      setLoadingFeedback(false);
    }
  }, []);

  useEffect(() => {
    loadAllTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadMembers(selectedTeamId);
      loadPendingRequests(selectedTeamId);
      loadFeedback(selectedTeamId);
    }
  }, [selectedTeamId, loadMembers, loadPendingRequests, loadFeedback]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showBanner("error", errorMessages.TEAM_NAME_REQUIRED);
      return;
    }
    setCreatingTeam(true);
    try {
      await api.post("/api/team/admin/create", { name: newTeamName.trim() });
      setNewTeamName("");
      await loadAllTeams();
      showBanner("success", "Team created successfully!");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to create team.");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleRenameTeam = async (teamId) => {
    if (!renameValue.trim()) {
      showBanner("error", errorMessages.TEAM_NAME_REQUIRED);
      return;
    }
    try {
      await api.patch(`/api/team/admin/${teamId}/rename`, {
        name: renameValue.trim(),
      });
      setRenamingTeamId(null);
      setRenameValue("");
      await loadAllTeams();
      showBanner("success", "Team renamed successfully!");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to rename team.");
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !selectedTeamId) return;
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${selectedTeamId}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("candidate");
      await loadMembers(selectedTeamId);
      showBanner("success", "Invite sent.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to send invite.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setBusyMember(userId);
    try {
      await api.patch(`/api/team/${selectedTeamId}/members/${userId}`, { role });
      await loadMembers(selectedTeamId);
      showBanner("success", "Role updated.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to update role.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleRemove = async (userId) => {
    setBusyMember(userId);
    try {
      await api.delete(`/api/team/${selectedTeamId}/members/${userId}`);
      await loadMembers(selectedTeamId);
      showBanner("success", "Member removed.");
    } catch (err) {
      showBanner("error", "Failed to remove member.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleApproveRequest = async (memberId) => {
    setBusyMember(memberId);
    try {
      await api.post(`/api/team/${selectedTeamId}/requests/${memberId}/approve`);
      await Promise.all([loadMembers(selectedTeamId), loadPendingRequests(selectedTeamId)]);
      showBanner("success", "Join request approved!");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to approve request.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleRejectRequest = async (memberId) => {
    setBusyMember(memberId);
    try {
      await api.post(`/api/team/${selectedTeamId}/requests/${memberId}/reject`);
      await loadPendingRequests(selectedTeamId);
      showBanner("success", "Join request rejected.");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to reject request.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await api.delete(`/api/team/${selectedTeamId}/feedback/${feedbackId}`);
      await loadFeedback(selectedTeamId);
      showBanner("success", "Feedback deleted.");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to delete feedback.");
    }
  };

  const selectedTeam = allTeams.find((t) => t.id === selectedTeamId);

  if (loading && allTeams.length === 0) {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        <p>Loading your teams...</p>
      </section>
    );
  }

  return (
    <section className="profile-box team-management-admin">
      <div className="team-header">
        <h3>Team Management</h3>
        <form onSubmit={handleCreateTeam} className="create-team-form">
          <input
            type="text"
            placeholder="New team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            disabled={creatingTeam}
          />
          <button type="submit" disabled={creatingTeam}>
            {creatingTeam ? "Creating..." : "Create Team"}
          </button>
        </form>
      </div>

      {banner.message && (
        <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
      )}

      <div className="team-management-grid">
        <div className="teams-sidebar">
          <h4>Your Teams</h4>
          {allTeams.length === 0 ? (
            <p>No teams yet. Create one above.</p>
          ) : (
            <ul className="teams-list">
              {allTeams.map((team) => (
                <li key={team.id} className={selectedTeamId === team.id ? "active" : ""}>
                  <div
                    className="team-item"
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    <div className="team-item-name">{team.name}</div>
                    <div className="team-item-meta">
                      {team.memberCount || 0} members
                    </div>
                  </div>
                  {renamingTeamId === team.id ? (
                    <div className="rename-input-group">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameTeam(team.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameTeam(team.id);
                          if (e.key === "Escape") {
                            setRenamingTeamId(null);
                            setRenameValue("");
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className="btn-rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingTeamId(team.id);
                        setRenameValue(team.name);
                      }}
                    >
                      Rename
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedTeam && (
          <div className="team-details">
            <h4>{selectedTeam.name}</h4>

            <form onSubmit={handleInvite} className="team-invite">
              <h5>Invite a member</h5>
              <div className="team-invite-row">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="candidate">Candidate</option>
                  <option value="mentor">Mentor</option>
                </select>
                <button type="submit" disabled={inviteBusy}>
                  {inviteBusy ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>

            {pendingRequests.length > 0 && (
              <div className="pending-requests">
                <h5>Pending Join Requests</h5>
                {loadingRequests ? (
                  <p>Loading requests...</p>
                ) : (
                  <table className="team-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Requested</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => {
                        const fullName = [request.firstName, request.lastName]
                          .filter(Boolean)
                          .join(" ") || "Unnamed";
                        return (
                          <tr key={request.userId}>
                            <td>{fullName}</td>
                            <td>{request.email}</td>
                            <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                            <td>
                              <div className="request-actions">
                                <button
                                  className="btn-approve"
                                  onClick={() => handleApproveRequest(request.userId)}
                                  disabled={busyMember === request.userId}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-reject"
                                  onClick={() => handleRejectRequest(request.userId)}
                                  disabled={busyMember === request.userId}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="team-members">
              <h5>Members</h5>
              {members.length === 0 ? (
                <p>No members yet.</p>
              ) : (
                <table className="team-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const fullName = [member.firstName, member.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unnamed";
                      const isSelf = member.userId === selectedTeam.ownerId && member.role === "admin";
                      const canEditRole = member.role !== "admin";

                      return (
                        <tr key={member.userId}>
                          <td>{fullName}</td>
                          <td>{member.email}</td>
                          <td>
                            {canEditRole ? (
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.userId, e.target.value)
                                }
                                disabled={busyMember === member.userId}
                              >
                                <option value="candidate">Candidate</option>
                                <option value="mentor">Mentor</option>
                              </select>
                            ) : (
                              member.role
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-${member.status}`}>
                              {member.status}
                            </span>
                          </td>
                          <td>
                            <div className="member-actions">
                              {member.role === "candidate" && (
                                <>
                                  <button
                                    className="btn-view-profile"
                                    onClick={() =>
                                      setViewingProfile({
                                        id: member.userId,
                                        name: fullName,
                                      })
                                    }
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    className="btn-feedback"
                                    onClick={() =>
                                      setFeedbackModal({
                                        candidateId: member.userId,
                                        candidateName: fullName,
                                      })
                                    }
                                  >
                                    Add Feedback
                                  </button>
                                </>
                              )}
                              <button
                                className="btn-secondary"
                                onClick={() => handleRemove(member.userId)}
                                disabled={isSelf || busyMember === member.userId}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Feedback Section */}
            {selectedTeam && (
              <div className="team-feedback-section">
                <div className="feedback-section-header">
                  <h4>Team Feedback</h4>
                  <div className="feedback-view-toggle">
                    <button
                      className={`view-toggle-btn ${feedbackViewMode === "list" ? "active" : ""}`}
                      onClick={() => setFeedbackViewMode("list")}
                    >
                      List View
                    </button>
                    <button
                      className={`view-toggle-btn ${feedbackViewMode === "threads" ? "active" : ""}`}
                      onClick={() => setFeedbackViewMode("threads")}
                    >
                      Conversations
                    </button>
                  </div>
                </div>

                {feedbackViewMode === "threads" ? (
                  <FeedbackThreads teamId={selectedTeamId} hideViewToggle={true} />
                ) : (
                  <>
                    {loadingFeedback ? (
                      <p>Loading feedback...</p>
                    ) : feedbackList.length === 0 ? (
                      <p>No feedback yet. Add feedback for candidates using the "Add Feedback" button above.</p>
                    ) : (
                      <div className="feedback-list">
                        {feedbackList.map((feedback) => {
                          const formatDate = (dateString) => {
                            return new Date(dateString).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                          };

                          const getFeedbackTypeLabel = (type) => {
                            switch (type) {
                              case "job": return "Job Feedback";
                              case "skill": return "Skill Feedback";
                              default: return "General Feedback";
                            }
                          };

                          const isOwnFeedback = feedback.mentorId === selectedTeam.ownerId;
                          const canEdit = isOwnFeedback || true; // Admin can edit all

                          return (
                            <div key={feedback.id} className="feedback-item">
                              <div className="feedback-header">
                                <div className="feedback-meta">
                                  <div className="feedback-top-row">
                                    <span className="feedback-type-badge">{getFeedbackTypeLabel(feedback.feedbackType)}</span>
                                    {feedback.jobTitle && (
                                      <span className="feedback-job-badge">
                                        {feedback.jobTitle}{feedback.jobCompany ? ` at ${feedback.jobCompany}` : ''}
                                      </span>
                                    )}
                                    {feedback.skillName && (
                                      <span className="feedback-skill-badge">{feedback.skillName}</span>
                                    )}
                                  </div>
                                  <div className="feedback-meta-row">
                                    <span className="feedback-candidate">{feedback.candidateName}</span>
                                    <span className="feedback-date">{formatDate(feedback.createdAt)}</span>
                                  </div>
                                </div>
                                {canEdit && (
                                  <div className="feedback-actions">
                                    <button
                                      className="btn-edit-feedback"
                                      onClick={() =>
                                        setFeedbackModal({
                                          candidateId: feedback.candidateId,
                                          candidateName: feedback.candidateName,
                                          feedbackId: feedback.id,
                                          existingFeedback: feedback,
                                        })
                                      }
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-delete-feedback"
                                      onClick={() => handleDeleteFeedback(feedback.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="feedback-content">{feedback.content}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidate Profile Modal */}
      {viewingProfile && selectedTeamId && (
        <CandidateProfileModal
          teamId={selectedTeamId}
          candidateId={viewingProfile.id}
          candidateName={viewingProfile.name}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* Feedback Modal */}
      {feedbackModal && selectedTeamId && (
        <FeedbackModal
          teamId={selectedTeamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          feedbackId={feedbackModal.feedbackId || null}
          existingFeedback={feedbackModal.existingFeedback || null}
          onClose={() => setFeedbackModal(null)}
          onSuccess={() => loadFeedback(selectedTeamId)}
        />
      )}
    </section>
  );
}

// ============================================================
// MENTOR VIEW: Manage one team
// ============================================================
function MentorTeamManagement() {
  const { teamState, refreshTeam } = useTeam();
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: null, message: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("candidate");
  const [busyMember, setBusyMember] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null); // { candidateId, candidateName, feedbackId?: number }
  const [feedbackViewMode, setFeedbackViewMode] = useState("list"); // "list" or "threads"

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: null, message: "" }), 5000);
  };

  const loadMembers = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/members`);
      // IMPORTANT: Do NOT filter - mentors should see ALL members including admins
      setMembers(data?.members || []);
    } catch (err) {
      showBanner("error", "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const loadPendingRequests = useCallback(async () => {
    if (!teamId) {
      setPendingRequests([]);
      return;
    }
    setLoadingRequests(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/pending-requests`);
      setPendingRequests(data?.requests || []);
    } catch (err) {
      // Silent fail - not all users can view requests
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [teamId]);

  const loadFeedback = useCallback(async () => {
    if (!teamId) {
      setFeedbackList([]);
      return;
    }
    setLoadingFeedback(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      console.log(`[Feedback] Loaded ${data?.feedback?.length || 0} feedback entries for team ${teamId}`);
      setFeedbackList(data?.feedback || []);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      console.error("Error response:", err.response?.data);
      setFeedbackList([]);
    } finally {
      setLoadingFeedback(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadMembers();
    loadPendingRequests();
    loadFeedback();
  }, [loadMembers, loadPendingRequests, loadFeedback]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !teamId) return;
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${teamId}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("candidate");
      await loadMembers();
      showBanner("success", "Invite sent.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to send invite.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    setBusyMember(userId);
    try {
      await api.patch(`/api/team/${teamId}/members/${userId}`, { role });
      await loadMembers();
      showBanner("success", "Role updated.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to update role.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleRemove = async (userId) => {
    setBusyMember(userId);
    try {
      await api.delete(`/api/team/${teamId}/members/${userId}`);
      await loadMembers();
      showBanner("success", "Member removed.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to remove member.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleApproveRequest = async (memberId) => {
    setBusyMember(memberId);
    try {
      await api.post(`/api/team/${teamId}/requests/${memberId}/approve`);
      await Promise.all([loadMembers(), loadPendingRequests()]);
      showBanner("success", "Join request approved!");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to approve request.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleRejectRequest = async (memberId) => {
    setBusyMember(memberId);
    try {
      await api.post(`/api/team/${teamId}/requests/${memberId}/reject`);
      await loadPendingRequests();
      showBanner("success", "Join request rejected.");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to reject request.");
    } finally {
      setBusyMember(null);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await api.delete(`/api/team/${teamId}/feedback/${feedbackId}`);
      await loadFeedback();
      showBanner("success", "Feedback deleted.");
    } catch (err) {
      showBanner("error", err.response?.data?.error || "Failed to delete feedback.");
    }
  };

  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        <p>No team found.</p>
      </section>
    );
  }

  return (
    <section className="profile-box">
      <h3>{teamName || "My Team"}</h3>
      <p>Manage your team members.</p>

      {banner.message && (
        <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
      )}

      {pendingRequests.length > 0 && (
        <div className="pending-requests">
          <h4>Pending Join Requests</h4>
          {loadingRequests ? (
            <p>Loading requests...</p>
          ) : (
            <table className="team-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((request) => {
                  const fullName = [request.firstName, request.lastName]
                    .filter(Boolean)
                    .join(" ") || "Unnamed";
                  return (
                    <tr key={request.userId}>
                      <td>{fullName}</td>
                      <td>{request.email}</td>
                      <td>{new Date(request.requestedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="request-actions">
                          <button
                            className="btn-approve"
                            onClick={() => handleApproveRequest(request.userId)}
                            disabled={busyMember === request.userId}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleRejectRequest(request.userId)}
                            disabled={busyMember === request.userId}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <form onSubmit={handleInvite} className="team-invite">
        <h4>Invite a member</h4>
        <div className="team-invite-row">
          <input
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="candidate">Candidate</option>
            <option value="mentor">Mentor</option>
          </select>
          <button type="submit" disabled={inviteBusy}>
            {inviteBusy ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </form>

      <div className="team-members">
        <h4>Members</h4>
        {loading ? (
          <p>Loading team members...</p>
        ) : members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const fullName = [member.firstName, member.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unnamed";
                const canEditRole = member.role !== "admin";
                // Mentors cannot remove admins or themselves - only admins can remove admins
                // Get current user ID from teamState to check if this is the mentor themselves
                const currentUserId = teamState?.primaryTeam?.userId;
                const isSelf = member.userId === currentUserId;
                const canRemove = member.role !== "admin" && !isSelf;

                return (
                  <tr key={member.userId}>
                    <td>{fullName}</td>
                    <td>{member.email}</td>
                    <td>
                      {canEditRole ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.userId, e.target.value)
                          }
                          disabled={busyMember === member.userId}
                        >
                          <option value="candidate">Candidate</option>
                          <option value="mentor">Mentor</option>
                        </select>
                      ) : (
                        member.role
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${member.status}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <div className="member-actions">
                        {member.role === "candidate" && (
                          <>
                            <button
                              className="btn-view-profile"
                              onClick={() =>
                                setViewingProfile({
                                  id: member.userId,
                                  name: fullName,
                                })
                              }
                            >
                              View Profile
                            </button>
                            <button
                              className="btn-feedback"
                              onClick={() =>
                                setFeedbackModal({
                                  candidateId: member.userId,
                                  candidateName: fullName,
                                })
                              }
                            >
                              Add Feedback
                            </button>
                          </>
                        )}
                        {canRemove && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleRemove(member.userId)}
                            disabled={busyMember === member.userId}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Feedback Section */}
      <div className="team-feedback-section">
        <div className="feedback-section-header">
          <h4>Team Feedback</h4>
          <div className="feedback-view-toggle">
            <button
              className={`view-toggle-btn ${feedbackViewMode === "list" ? "active" : ""}`}
              onClick={() => setFeedbackViewMode("list")}
            >
              List View
            </button>
            <button
              className={`view-toggle-btn ${feedbackViewMode === "threads" ? "active" : ""}`}
              onClick={() => setFeedbackViewMode("threads")}
            >
              Conversations
            </button>
          </div>
        </div>

        {feedbackViewMode === "threads" ? (
          <FeedbackThreads teamId={teamId} hideViewToggle={true} />
        ) : (
          <>
            {loadingFeedback ? (
              <p>Loading feedback...</p>
            ) : feedbackList.length === 0 ? (
              <p>No feedback yet. Add feedback for candidates using the "Add Feedback" button above.</p>
            ) : (
              <div className="feedback-list">
                {feedbackList.map((feedback) => {
                  const formatDate = (dateString) => {
                    return new Date(dateString).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  };

                  const getFeedbackTypeLabel = (type) => {
                    switch (type) {
                      case "job": return "Job Feedback";
                      case "skill": return "Skill Feedback";
                      default: return "General Feedback";
                    }
                  };

                  const isOwnFeedback = feedback.mentorId === teamState?.primaryTeam?.userId;
                  const canEdit = isOwnFeedback || teamState?.isAdmin;

                  return (
                    <div key={feedback.id} className="feedback-item">
                      <div className="feedback-header">
                        <div className="feedback-meta">
                          <div className="feedback-top-row">
                            <span className="feedback-type-badge">{getFeedbackTypeLabel(feedback.feedbackType)}</span>
                            {feedback.jobTitle && (
                              <span className="feedback-job-badge">
                                {feedback.jobTitle}{feedback.jobCompany ? ` at ${feedback.jobCompany}` : ''}
                              </span>
                            )}
                            {feedback.skillName && (
                              <span className="feedback-skill-badge">{feedback.skillName}</span>
                            )}
                          </div>
                          <div className="feedback-meta-row">
                            <span className="feedback-candidate">{feedback.candidateName}</span>
                            <span className="feedback-date">{formatDate(feedback.createdAt)}</span>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="feedback-actions">
                            <button
                              className="btn-edit-feedback"
                              onClick={() =>
                                setFeedbackModal({
                                  candidateId: feedback.candidateId,
                                  candidateName: feedback.candidateName,
                                  feedbackId: feedback.id,
                                  existingFeedback: feedback,
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete-feedback"
                              onClick={() => handleDeleteFeedback(feedback.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="feedback-content">{feedback.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Candidate Profile Modal */}
      {viewingProfile && (
        <CandidateProfileModal
          teamId={teamId}
          candidateId={viewingProfile.id}
          candidateName={viewingProfile.name}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {/* Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          teamId={teamId}
          candidateId={feedbackModal.candidateId}
          candidateName={feedbackModal.candidateName}
          feedbackId={feedbackModal.feedbackId || null}
          existingFeedback={feedbackModal.existingFeedback || null}
          onClose={() => setFeedbackModal(null)}
          onSuccess={loadFeedback}
        />
      )}
    </section>
  );
}

// ============================================================
// CANDIDATE VIEW: Request mentors and invite peers
// ============================================================
function CandidateTeamManagement() {
  const { teamState, refreshTeam } = useTeam();
  const teamId = teamState?.primaryTeam?.id;
  const teamName = teamState?.primaryTeam?.name;
  const inviteStatus = teamState?.primaryTeam?.status;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: null, message: "" });
  const [mentorEmail, setMentorEmail] = useState("");
  const [peerEmail, setPeerEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: null, message: "" }), 5000);
  };

  const loadMembers = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    // Don't load members if status is "requested" or "invited" - candidate can't see team yet
    // They must accept the invitation first (invited → active) or get approved (requested → active)
    if (inviteStatus === "requested" || inviteStatus === "invited") {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/members`);
      // Filter to show only mentors and candidates (exclude admin)
      setMembers(
        (data?.members || []).filter(
          (m) => m.role === "mentor" || m.role === "candidate"
        )
      );
    } catch (err) {
      showBanner("error", "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [teamId, inviteStatus]);

  useEffect(() => {
    // Only load members if we have a team and status is "active" (not "requested" or "invited")
    if (teamId && inviteStatus === "active") {
      loadMembers();
    } else {
      setLoading(false);
    }
  }, [loadMembers, teamId, inviteStatus]);

  const handleSearchTeams = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/api/team/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data?.teams || []);
    } catch (err) {
      showBanner("error", "Failed to search teams.");
    } finally {
      setSearching(false);
    }
  };

  const handleRequestJoinTeam = async (teamIdToJoin) => {
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${teamIdToJoin}/request-join`);
      setSearchQuery("");
      setSearchResults([]);
      await refreshTeam();
      showBanner("success", "Join request sent! Wait for admin approval.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to send join request.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRequestMentor = async (e) => {
    e.preventDefault();
    
    // Validate email input
    if (!mentorEmail || mentorEmail.trim() === "") {
      showBanner("error", "Please enter a mentor email address.");
      return;
    }
    
    // Check if user already has a pending request or invite
    if (inviteStatus === "requested") {
      showBanner("error", "You already have a pending join request. Please wait for approval.");
      return;
    }
    
    if (inviteStatus === "invited") {
      showBanner("error", "You have a pending team invitation. Please accept it first in the Mentor tab.");
      return;
    }
    
    // Require teamId - candidate must be in a team to request a mentor
    if (!teamId) {
      showBanner("error", "You must be part of a team to request a mentor. Please join a team first.");
      return;
    }
    
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${teamId}/request-mentor`, {
        email: mentorEmail.trim(),
      });
      setMentorEmail("");
      await loadMembers();
      await refreshTeam();
      showBanner("success", "Mentor request sent.");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      // Use custom message if provided, otherwise use error code mapping
      const errorMsg = message || errorMessages[code] || "Failed to send request.";
      console.error("Request mentor error:", { code, message, fullError: err.response?.data, err });
      showBanner("error", errorMsg);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleInvitePeer = async (e) => {
    e.preventDefault();
    if (!peerEmail || !teamId || inviteStatus === "requested" || inviteStatus === "invited") return;
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${teamId}/invite`, {
        email: peerEmail,
        role: "candidate",
      });
      setPeerEmail("");
      await loadMembers();
      showBanner("success", "Invite sent to peer.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to send invite.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!teamId) return;
    if (!window.confirm("Are you sure you want to leave this team? You'll need to be invited or request to join again.")) {
      return;
    }
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${teamId}/leave`);
      await refreshTeam();
      showBanner("success", "You have left the team.");
    } catch (err) {
      const code = err.response?.data?.error;
      showBanner("error", errorMessages[code] || "Failed to leave team.");
    } finally {
      setInviteBusy(false);
    }
  };

  // No team - show join/request options
  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        <p>Join a team or request a mentor to get started.</p>

        {banner.message && (
          <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
        )}

        <div className="no-team-options">
          <form onSubmit={handleSearchTeams} className="team-search">
            <h4>Search and Join a Team</h4>
            <div className="team-invite-row">
              <input
                type="text"
                placeholder="Search by team name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
              <button type="submit" disabled={searching}>
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h5>Teams Found</h5>
              <ul className="teams-list-compact">
                {searchResults.map((team) => (
                  <li key={team.id}>
                    <div className="team-result-item">
                      <div>
                        <strong>{team.name}</strong>
                        <div className="team-result-meta">
                          {team.memberCount || 0} members
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleRequestJoinTeam(team.id)}
                        disabled={inviteBusy}
                      >
                        Request to Join
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </section>
    );
  }

  // If status is "requested", show pending message only (don't show team details)
  if (inviteStatus === "requested") {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        {banner.message && (
          <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
        )}
        <div className="pending-request-message">
          <h4>Join Request Pending</h4>
          <p>
            Your request to join <strong>{teamName}</strong> is pending approval by a mentor or admin.
            You'll be able to see team details and manage members once your request is approved.
          </p>
        </div>
      </section>
    );
  }

  // If status is "invited", show invitation message only (don't show team details)
  // They should accept the invitation in the Mentor tab first
  if (inviteStatus === "invited") {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        {banner.message && (
          <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
        )}
        <div className="pending-request-message">
          <h4>Team Invitation</h4>
          <p>
            You've been invited to join <strong>{teamName}</strong>.
            Please accept the invitation in the <strong>Mentor</strong> tab to see team details and manage members.
          </p>
        </div>
      </section>
    );
  }

  // Team exists and status is active/invited - show full team management
  return (
    <section className="profile-box">
      <h3>{teamName || "My Team"}</h3>
      <p>Request mentors or invite peers to your team.</p>

      {banner.message && (
        <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
      )}

      <div className="candidate-actions">
        <form onSubmit={handleRequestMentor} className="team-invite">
          <h4>Request a Mentor</h4>
          <p className="team-invite-subtext">
            Request a mentor by email. The mentor will be invited to join your team.
          </p>
          <div className="team-invite-row">
            <input
              type="email"
              placeholder="mentor@example.com"
              value={mentorEmail}
              onChange={(e) => setMentorEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={inviteBusy}>
              {inviteBusy ? "Sending..." : "Request Mentor"}
            </button>
          </div>
        </form>

        <form onSubmit={handleInvitePeer} className="team-invite">
          <h4>Invite a Peer</h4>
          <div className="team-invite-row">
            <input
              type="email"
              placeholder="peer@example.com"
              value={peerEmail}
              onChange={(e) => setPeerEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={inviteBusy}>
              {inviteBusy ? "Sending..." : "Invite Peer"}
            </button>
          </div>
        </form>
      </div>

      <div className="team-members">
        <div className="members-card-header">
          <h4>Team Members</h4>
          <button
            className="btn-secondary"
            onClick={handleLeaveTeam}
            disabled={inviteBusy}
            style={{ marginLeft: "auto" }}
          >
            {inviteBusy ? "Leaving..." : "Leave Team"}
          </button>
        </div>
        {loading ? (
          <p>Loading team members...</p>
        ) : members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const fullName = [member.firstName, member.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unnamed";

                return (
                  <tr key={member.userId}>
                    <td>{fullName}</td>
                    <td>{member.email}</td>
                    <td>
                      <span className={`role-badge role-${member.role}`}>
                        {member.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${member.status}`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ============================================================
// MAIN COMPONENT: Route to correct view based on role
// ============================================================
export default function TeamManagement() {
  const { teamState } = useTeam();

  if (teamState?.status === "loading") {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        <p>Loading...</p>
      </section>
    );
  }

  if (teamState?.isAdmin) {
    return <AdminTeamManagement />;
  }

  if (teamState?.isMentor) {
    return <MentorTeamManagement />;
  }

  return <CandidateTeamManagement />;
}
