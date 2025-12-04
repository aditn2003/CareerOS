import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useTeam } from "../../contexts/TeamContext";
import CandidateProfileModal from "../../components/CandidateProfileModal";
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
  const { teamState, refreshTeam } = useTeam();
  const currentUserId = teamState?.userId;
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

  const showBanner = (type, message) => {
    if (!message) return;
    setBanner({ type, message });
    setTimeout(() => setBanner({ type: null, message: "" }), 5000);
  };

  const loadAllTeams = useCallback(async () => {
    setLoading(true);
    try {
      // Try mentor/all first, fallback to admin/all for backward compatibility
      let data;
      try {
        const response = await api.get("/api/team/mentor/all");
        data = response.data;
      } catch (err) {
        // Fallback to admin/all if mentor/all doesn't work
        const response = await api.get("/api/team/admin/all");
        data = response.data;
      }
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

  useEffect(() => {
    loadAllTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadMembers(selectedTeamId);
      loadPendingRequests(selectedTeamId);
    }
  }, [selectedTeamId, loadMembers, loadPendingRequests]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showBanner("error", errorMessages.TEAM_NAME_REQUIRED);
      return;
    }
    setCreatingTeam(true);
    try {
      await api.post("/api/team/create", { name: newTeamName.trim() });
      setNewTeamName("");
      await loadAllTeams();
      showBanner("success", "Team created successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to create team.";
      showBanner("error", errorMsg);
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
      await api.patch(`/api/team/${teamId}/rename`, {
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

  const handleDeleteTeam = async (teamId, teamName) => {
    const confirmMessage = `Are you sure you want to delete "${teamName}"? This action cannot be undone. All team members, feedback, tasks, and shared jobs will be permanently deleted.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    // Double confirmation for destructive action
    if (!window.confirm(`This will permanently delete "${teamName}" and all its data. Are you absolutely sure?`)) {
      return;
    }
    
    setInviteBusy(true);
    try {
      await api.delete(`/api/team/${teamId}`);
      await loadAllTeams();
      // Clear selection if deleted team was selected
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
      showBanner("success", "Team deleted successfully!");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      showBanner("error", message || errorMessages[code] || "Failed to delete team.");
    } finally {
      setInviteBusy(false);
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

  const handleLeaveTeam = async () => {
    if (!selectedTeamId) return;
    if (!window.confirm(`Are you sure you want to leave "${selectedTeam?.name}"?`)) {
      return;
    }
    setInviteBusy(true);
    try {
      await api.post(`/api/team/${selectedTeamId}/leave`);
      await loadAllTeams();
      setSelectedTeamId(null);
      showBanner("success", "You have left the team.");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      showBanner("error", message || errorMessages[code] || "Failed to leave team.");
    } finally {
      setInviteBusy(false);
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
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                    {renamingTeamId === team.id ? (
                      <div className="rename-input-group" style={{ flex: 1 }}>
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
                      <>
                        {team.ownerId === currentUserId && (
                          <>
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
                            <button
                              className="btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(team.id, team.name);
                              }}
                              disabled={inviteBusy}
                              style={{
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: inviteBusy ? "not-allowed" : "pointer",
                                fontSize: "0.85em"
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedTeam && (
          <div className="team-details">
            <h4>{selectedTeam.name}</h4>

            <form onSubmit={handleInvite} className="team-invite">
              <h5>Invite Members</h5>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h5>Members</h5>
                {selectedTeam.ownerId !== currentUserId && (
                  <button
                    className="btn-secondary btn-leave-team"
                    onClick={handleLeaveTeam}
                    disabled={inviteBusy}
                  >
                    Leave Team
                  </button>
                )}
              </div>
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
                      const teamOwnerId = selectedTeam?.ownerId;
                      const isMemberOwner = member.userId === teamOwnerId;
                      const isSelf = member.userId === currentUserId;
                      // Team owners cannot have their role changed
                      const canEditRole = !isMemberOwner;

                      return (
                        <tr key={member.userId}>
                          <td>
                            {fullName}
                            {isMemberOwner && (
                              <span style={{ 
                                marginLeft: "8px", 
                                padding: "2px 6px", 
                                backgroundColor: "#e3f2fd", 
                                color: "#1976d2", 
                                borderRadius: "3px", 
                                fontSize: "0.75em",
                                fontWeight: "500"
                              }}>
                                Owner
                              </span>
                            )}
                          </td>
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
                              <select
                                value={member.role}
                                disabled
                                style={{ 
                                  opacity: 0.6, 
                                  cursor: "not-allowed",
                                  backgroundColor: "#f3f4f6",
                                  color: "#6b7280"
                                }}
                              >
                                <option value={member.role}>{member.role}</option>
                              </select>
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-${member.status}`}>
                              {member.status}
                            </span>
                          </td>
                          <td>
                            <div className="member-actions">
                              {/* Profile visibility rules:
                                  1. Candidates can NEVER see mentor profiles
                                  2. Team owner (hidden admin) can see candidate profiles
                                  3. Mentors can see candidate profiles by default */}
                              {(() => {
                                const viewerAccountType = teamState?.accountType;
                                const currentUserId = teamState?.userId;
                                const isTeamOwner = selectedTeam?.ownerId === currentUserId;
                                const isViewerMentor = viewerAccountType === "mentor";
                                const isMemberCandidate = member.accountType === "candidate";
                                const isMemberMentor = member.accountType === "mentor";
                                
                                // Rule 1: Candidates cannot view mentor profiles
                                if (viewerAccountType === "candidate" && isMemberMentor) {
                                  return null;
                                }
                                
                                // Rule 2 & 3: Show for candidates if viewer is owner or mentor
                                if (isMemberCandidate && (isTeamOwner || isViewerMentor)) {
                                  return (
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
                                  );
                                }
                                
                                return null;
                              })()}
                              <button
                                className="btn-secondary"
                                onClick={() => handleRemove(member.userId)}
                                disabled={isMemberOwner || isSelf || busyMember === member.userId}
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

  useEffect(() => {
    loadMembers();
    loadPendingRequests();
  }, [loadMembers, loadPendingRequests]);

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

  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>
        <p>No team found.</p>
      </section>
    );
  }

  const teamOwnerId = teamState?.primaryTeam?.ownerId;
  const currentUserId = teamState?.userId;
  const isTeamOwner = teamOwnerId === currentUserId;

  return (
    <section className="profile-box">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3>{teamName || "My Team"}</h3>
        {!isTeamOwner && (
          <button
            className="btn-secondary btn-leave-team"
            onClick={handleLeaveTeam}
            disabled={inviteBusy}
          >
            Leave Team
          </button>
        )}
      </div>
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
        <h4>Invite Members</h4>
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
                const teamOwnerId = teamState?.primaryTeam?.ownerId;
                const currentUserId = teamState?.userId;
                const isMemberOwner = member.userId === teamOwnerId;
                const isSelf = member.userId === currentUserId;
                // Team owners cannot have their role changed
                const canEditRole = !isMemberOwner;
                // Mentors cannot remove owners or themselves
                const canRemove = !isMemberOwner && !isSelf;

                return (
                  <tr key={member.userId}>
                    <td>
                      {fullName}
                      {isMemberOwner && (
                        <span style={{ 
                          marginLeft: "8px", 
                          padding: "2px 6px", 
                          backgroundColor: "#e3f2fd", 
                          color: "#1976d2", 
                          borderRadius: "3px", 
                          fontSize: "0.75em",
                          fontWeight: "500"
                        }}>
                          Owner
                        </span>
                      )}
                    </td>
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
                        <select
                          value={member.role}
                          disabled
                          style={{ 
                            opacity: 0.6, 
                            cursor: "not-allowed",
                            backgroundColor: "#f3f4f6",
                            color: "#6b7280"
                          }}
                        >
                          <option value={member.role}>{member.role}</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${member.status}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <div className="member-actions">
                        {/* Profile visibility rules:
                            1. Candidates can NEVER see mentor profiles
                            2. Team owner (hidden admin) can see candidate profiles
                            3. Mentors can see candidate profiles by default */}
                        {(() => {
                          const viewerAccountType = teamState?.accountType;
                          const currentUserId = teamState?.userId;
                          const isTeamOwner = teamState?.primaryTeam?.ownerId === currentUserId;
                          const isViewerMentor = viewerAccountType === "mentor";
                          const isMemberCandidate = member.accountType === "candidate";
                          const isMemberMentor = member.accountType === "mentor";
                          
                          // Rule 1: Candidates cannot view mentor profiles
                          if (viewerAccountType === "candidate" && isMemberMentor) {
                            return null;
                          }
                          
                          // Rule 2 & 3: Show for candidates if viewer is owner or mentor
                          if (isMemberCandidate && (isTeamOwner || isViewerMentor)) {
                            return (
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
                            );
                          }
                          
                          return null;
                        })()}
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

      {/* Candidate Profile Modal */}
      {viewingProfile && (
        <CandidateProfileModal
          teamId={teamId}
          candidateId={viewingProfile.id}
          candidateName={viewingProfile.name}
          onClose={() => setViewingProfile(null)}
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
  const teamOwnerId = teamState?.primaryTeam?.ownerId;
  const inviteStatus = teamState?.primaryTeam?.status;
  const currentUserId = teamState?.userId;
  const isTeamOwner = teamOwnerId === currentUserId;
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ type: null, message: "" });
  const [mentorEmail, setMentorEmail] = useState("");
  const [peerEmail, setPeerEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("candidate");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [renamingTeam, setRenamingTeam] = useState(false);
  const [renameValue, setRenameValue] = useState("");

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
        role: isTeamOwner ? inviteRole : "candidate", // Team owners can choose role
      });
      setPeerEmail("");
      setInviteRole("candidate"); // Reset to default
      await loadMembers();
      showBanner("success", "Invite sent.");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      showBanner("error", message || errorMessages[code] || "Failed to send invite.");
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

  const handleDeleteTeam = async () => {
    if (!teamId) return;
    const teamNameToDelete = teamName || "this team";
    const confirmMessage = `Are you sure you want to delete "${teamNameToDelete}"? This action cannot be undone. All team members, feedback, tasks, and shared jobs will be permanently deleted.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    // Double confirmation for destructive action
    if (!window.confirm(`This will permanently delete "${teamNameToDelete}" and all its data. Type the team name to confirm: ${teamNameToDelete}`)) {
      return;
    }
    
    setInviteBusy(true);
    try {
      await api.delete(`/api/team/${teamId}`);
      await refreshTeam();
      showBanner("success", "Team deleted successfully.");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      showBanner("error", message || errorMessages[code] || "Failed to delete team.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRenameTeam = async () => {
    if (!renameValue.trim() || !teamId) {
      showBanner("error", "Please enter a team name.");
      return;
    }
    setInviteBusy(true);
    try {
      await api.patch(`/api/team/${teamId}/rename`, {
        name: renameValue.trim(),
      });
      setRenamingTeam(false);
      setRenameValue("");
      await refreshTeam();
      showBanner("success", "Team renamed successfully!");
    } catch (err) {
      const code = err.response?.data?.error;
      const message = err.response?.data?.message;
      showBanner("error", message || errorMessages[code] || "Failed to rename team.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      showBanner("error", "Please enter a team name.");
      return;
    }
    setCreatingTeam(true);
    try {
      await api.post("/api/team/create", { name: newTeamName.trim() });
      setNewTeamName("");
      await refreshTeam();
      showBanner("success", "Team created successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to create team.";
      showBanner("error", errorMsg);
    } finally {
      setCreatingTeam(false);
    }
  };

  // No team - show join/request options
  if (!teamId) {
    return (
      <section className="profile-box">
        <h3>Team Management</h3>

        {banner.message && (
          <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
        )}

        <div className="no-team-options">
          <form onSubmit={handleCreateTeam} className="team-create">
            <h4>Create Your Own Team</h4>
            <p className="team-invite-subtext">
              Create a team and invite members. As the team creator, you'll have full management permissions.
            </p>
            <div className="team-invite-row">
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
              <button type="submit" disabled={creatingTeam}>
                {creatingTeam ? "Creating..." : "Create Team"}
              </button>
            </div>
          </form>

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
      <div className="team-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          {renamingTeam ? (
            <>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameTeam();
                  if (e.key === "Escape") {
                    setRenamingTeam(false);
                    setRenameValue("");
                  }
                }}
                autoFocus
                style={{
                  padding: "6px 12px",
                  fontSize: "1.2em",
                  fontWeight: "bold",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  flex: 1
                }}
              />
              <button
                onClick={handleRenameTeam}
                disabled={inviteBusy}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: inviteBusy ? "not-allowed" : "pointer"
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setRenamingTeam(false);
                  setRenameValue("");
                }}
                disabled={inviteBusy}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: inviteBusy ? "not-allowed" : "pointer"
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
                <h3>{teamName || "My Team"}</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {isTeamOwner && (
                    <>
                      <button
                        onClick={() => {
                          setRenameValue(teamName || "");
                          setRenamingTeam(true);
                        }}
                        disabled={inviteBusy}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "transparent",
                          color: "#1976d2",
                          border: "1px solid #1976d2",
                          borderRadius: "4px",
                          cursor: inviteBusy ? "not-allowed" : "pointer",
                          fontSize: "0.85em"
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="btn-danger"
                        onClick={handleDeleteTeam}
                        disabled={inviteBusy}
                        style={{
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          padding: "4px 12px",
                          borderRadius: "4px",
                          cursor: inviteBusy ? "not-allowed" : "pointer",
                          fontSize: "0.9em",
                          fontWeight: "500"
                        }}
                      >
                        {inviteBusy ? "Deleting..." : "Delete Team"}
                      </button>
                    </>
                  )}
                  {!isTeamOwner && (
                    <button
                      className="btn-secondary btn-leave-team"
                      onClick={handleLeaveTeam}
                      disabled={inviteBusy}
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {banner.message && (
        <div className={`banner ${banner.type}-banner`}>{banner.message}</div>
      )}

      <div className="candidate-actions">
        {isTeamOwner ? (
          <>
            {/* Team owner can invite both mentors and candidates */}
            <form onSubmit={handleInvitePeer} className="team-invite">
              <h4>Invite Members</h4>
              <div className="team-invite-row">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={peerEmail}
                  onChange={(e) => setPeerEmail(e.target.value)}
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ marginRight: "8px" }}
                >
                  <option value="candidate">Candidate</option>
                  <option value="mentor">Mentor</option>
                </select>
                <button type="submit" disabled={inviteBusy}>
                  {inviteBusy ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Regular members can request mentors and invite peers */}
            <form onSubmit={handleRequestMentor} className="team-invite">
              <h4>Request a Mentor</h4>
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
          </>
        )}
      </div>

      <div className="team-members" style={{ marginTop: "2rem" }}>
        <div className="members-card-header">
          <h4>Team Members</h4>
          
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
                {isTeamOwner && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const fullName = [member.firstName, member.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unnamed";
                const isMemberOwner = member.userId === teamOwnerId;

                return (
                  <tr key={member.userId}>
                    <td>
                      {fullName}
                      {isMemberOwner && (
                        <span style={{ 
                          marginLeft: "8px", 
                          padding: "2px 6px", 
                          backgroundColor: "#e3f2fd", 
                          color: "#1976d2", 
                          borderRadius: "3px", 
                          fontSize: "0.75em",
                          fontWeight: "500"
                        }}>
                          Owner
                        </span>
                      )}
                    </td>
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
                    {isTeamOwner && (
                      <td>
                        {!isMemberOwner && (
                          <button
                            className="btn-secondary"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to remove ${fullName} from the team?`)) {
                                setInviteBusy(true);
                                try {
                                  await api.delete(`/api/team/${teamId}/members/${member.userId}`);
                                  await loadMembers();
                                  showBanner("success", "Member removed.");
                                } catch (err) {
                                  showBanner("error", err.response?.data?.error || "Failed to remove member.");
                                } finally {
                                  setInviteBusy(false);
                                }
                              }
                            }}
                            disabled={inviteBusy}
                            style={{ fontSize: "0.9em", padding: "4px 8px" }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
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
