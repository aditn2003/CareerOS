import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api";
import { useTeam } from "../contexts/TeamContext";
import "./FeedbackThreads.css";

export default function FeedbackThreads({ teamId, hideViewToggle = false }) {
  const { teamState } = useTeam();
  const [people, setPeople] = useState([]); // Candidates for mentors, Mentors for candidates
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState({});
  const [viewMode, setViewMode] = useState("threads"); // "list" or "threads"
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false); // Guard to prevent concurrent loads

  const isMentor = teamState?.isMentor || teamState?.isAdmin;
  const isCandidate = teamState?.isCandidate;
  const currentUserId = teamState?.primaryTeam?.userId;

  // Load people in the team (candidates for mentors, mentors for candidates)
  useEffect(() => {
    if (!teamId) return;

    const loadPeople = async () => {
      try {
        const { data } = await api.get(`/api/team/${teamId}/members`);
        
        if (isCandidate) {
          // For candidates, load ONLY mentors (not admins)
          const mentorList = (data?.members || []).filter(
            (m) => m.role === "mentor" && m.status === "active"
          );
          setPeople(mentorList);
          if (mentorList.length > 0 && !selectedPersonId) {
            setSelectedPersonId(mentorList[0].userId);
          } else if (mentorList.length === 0 && !selectedPersonId) {
            // No mentors, show their own feedback
            setSelectedPersonId(currentUserId);
          }
        } else {
          // For mentors/admins, load candidates
          const candidateList = (data?.members || []).filter(
            (m) => m.role === "candidate" && m.status === "active"
          );
          setPeople(candidateList);
          if (candidateList.length > 0 && !selectedPersonId) {
            setSelectedPersonId(candidateList[0].userId);
          }
        }
      } catch (err) {
        console.error("Failed to load people:", err);
      }
    };

    loadPeople();
  }, [teamId, isCandidate, currentUserId]); // Removed selectedPersonId to prevent infinite loop

  // Load feedback based on selection
  const loadFeedback = useCallback(async () => {
    if (!teamId || isLoadingFeedback) {
      if (!teamId) setFeedbackList([]);
      return;
    }

    setIsLoadingFeedback(true);
    setLoading(true);
    try {
      const { data } = await api.get(`/api/team/${teamId}/feedback`);
      let filteredFeedback = data?.feedback || [];

      if (isCandidate) {
        // For candidates viewing by mentor: filter to feedback from selected mentor
        if (selectedPersonId && selectedPersonId !== currentUserId) {
          filteredFeedback = filteredFeedback.filter((fb) => fb.mentorId === selectedPersonId);
        }
        // If viewing own or no mentor selected, show all their feedback (already filtered by backend)
      } else {
        // For mentors: filter to selected candidate
        if (selectedPersonId) {
          filteredFeedback = filteredFeedback.filter((fb) => fb.candidateId === selectedPersonId);
        }
      }

      setFeedbackList(filteredFeedback);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setFeedbackList([]);
    } finally {
      setLoading(false);
      setIsLoadingFeedback(false);
    }
  }, [teamId, selectedPersonId, isCandidate, currentUserId, isLoadingFeedback]);

  // Debounce feedback loading to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeedback();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [teamId, selectedPersonId, isCandidate, currentUserId]);

  const selectedPerson = people.find((p) => p.userId === selectedPersonId);

  return (
    <div className="feedback-threads-container">
      {/* Left Sidebar - People List (candidates for mentors, mentors for candidates) */}
      {people.length > 0 && (
        <div className="feedback-threads-sidebar">
          <div className="feedback-threads-sidebar-header">
            <h3>{isCandidate ? "Mentors" : "Candidates"}</h3>
          </div>
          <div className="candidates-list">
            {people.map((person) => {
              const fullName = [person.firstName, person.lastName]
                .filter(Boolean)
                .join(" ") || person.email || "Unnamed";
              const isSelected = person.userId === selectedPersonId;

              return (
                <div
                  key={person.userId}
                  className={`candidate-item ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedPersonId(person.userId)}
                >
                  <div className="candidate-avatar">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="candidate-info">
                    <div className="candidate-name">{fullName}</div>
                    <div className="candidate-email">{person.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Right Side - Feedback Threads */}
      <div className={`feedback-threads-main ${people.length === 0 ? "full-width" : ""}`}>
        <div className="feedback-threads-content">
          {/* View Toggle */}
          <div className="feedback-threads-header">
            <h3>
              {isCandidate
                ? selectedPerson
                  ? `Feedback from ${[selectedPerson.firstName, selectedPerson.lastName].filter(Boolean).join(" ") || selectedPerson.email}`
                  : "All Feedback"
                : selectedPerson
                ? `Feedback for ${[selectedPerson.firstName, selectedPerson.lastName].filter(Boolean).join(" ") || selectedPerson.email}`
                : "Team Feedback"}
            </h3>
            {!hideViewToggle && (
              <div className="feedback-view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List View
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "threads" ? "active" : ""}`}
                  onClick={() => setViewMode("threads")}
                >
                  Conversations
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="feedback-threads-empty">
              <p>Loading feedback...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="feedback-threads-empty">
              <p>
                {isCandidate
                  ? selectedPerson
                    ? `No feedback yet from ${[selectedPerson.firstName, selectedPerson.lastName].filter(Boolean).join(" ") || selectedPerson.email}`
                    : "No feedback yet. Your mentors will provide feedback here."
                  : selectedPerson
                  ? `No feedback yet for ${[selectedPerson.firstName, selectedPerson.lastName].filter(Boolean).join(" ") || selectedPerson.email}`
                  : "No feedback yet."}
              </p>
            </div>
          ) : viewMode === "threads" ? (
            <div className="feedback-threads-list">
              {feedbackList.map((feedback) => (
                <FeedbackThreadItem
                  key={feedback.id}
                  feedback={feedback}
                  teamId={teamId}
                  isExpanded={expandedFeedbackId === feedback.id}
                  onToggleExpand={() =>
                    setExpandedFeedbackId(
                      expandedFeedbackId === feedback.id ? null : feedback.id
                    )
                  }
                  loadingReplies={loadingReplies[feedback.id]}
                  onLoadingReplies={(loading) =>
                    setLoadingReplies((prev) => ({ ...prev, [feedback.id]: loading }))
                  }
                />
              ))}
            </div>
          ) : (
            <FeedbackListView feedbackList={feedbackList} teamId={teamId} />
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Feedback Thread Item
function FeedbackThreadItem({
  feedback,
  teamId,
  isExpanded,
  onToggleExpand,
  loadingReplies,
  onLoadingReplies,
}) {
  const [replies, setReplies] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null); // null = reply to feedback, otherwise reply ID
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [repliesLoaded, setRepliesLoaded] = useState(false);

  const loadReplies = useCallback(async () => {
    if (!isExpanded || repliesLoaded) return; // Don't reload if already loaded

    onLoadingReplies(true);
    try {
      const { data } = await api.get(
        `/api/team/${teamId}/feedback/${feedback.id}/replies`
      );
      setReplies(data?.replies || []);
      setRepliesLoaded(true);
    } catch (err) {
      console.error("Failed to load replies:", err);
      setReplies([]);
    } finally {
      onLoadingReplies(false);
    }
  }, [isExpanded, teamId, feedback.id, onLoadingReplies, repliesLoaded]);

  useEffect(() => {
    if (isExpanded) {
      loadReplies();
    } else {
      // Reset loaded state when collapsed so it reloads when expanded again
      setRepliesLoaded(false);
    }
  }, [isExpanded, loadReplies]);

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.post(`/api/team/${teamId}/feedback/${feedback.id}/replies`, {
        content: replyContent.trim(),
        parentReplyId: replyingTo || null,
      });
      setReplyContent("");
      setReplyingTo(null);
      // Reload replies to get the new one
      onLoadingReplies(true);
      setRepliesLoaded(false);
      try {
        const { data } = await api.get(
          `/api/team/${teamId}/feedback/${feedback.id}/replies`
        );
        setReplies(data?.replies || []);
        setRepliesLoaded(true);
      } catch (err) {
        console.error("Failed to reload replies:", err);
      } finally {
        onLoadingReplies(false);
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
      alert(err.response?.data?.error || "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedbackTypeLabel = (type) => {
    switch (type) {
      case "job":
        return "Job Feedback";
      case "skill":
        return "Skill Feedback";
      default:
        return "General Feedback";
    }
  };

  const replyCount = replies.reduce((count, reply) => {
    const countChildren = (r) => r.replies.length + r.replies.reduce((sum, child) => sum + countChildren(child), 0);
    return count + 1 + countChildren(reply);
  }, 0);

  return (
    <div className="feedback-thread-item">
      {/* Original Feedback */}
      <div className="feedback-thread-header">
        <div className="feedback-thread-info">
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
            <span className="feedback-author">By: {feedback.mentorName}</span>
            <span className="feedback-date">{formatDate(feedback.createdAt)}</span>
            {replyCount > 0 && (
              <span className="reply-count">{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
            )}
          </div>
        </div>
        <button className="expand-toggle" onClick={onToggleExpand}>
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      <div className="feedback-thread-content">
        {feedback.content}
      </div>

      {/* Replies Section */}
      {isExpanded && (
        <div className="feedback-thread-replies">
          {/* Reply Input - Only show if there are no replies yet */}
          {replies.length === 0 && (
            <form onSubmit={handleSubmitReply} className="reply-form">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Ask a question or add a comment..."}
                rows={3}
                required
              />
              {replyingTo && (
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="cancel-reply"
                >
                  Cancel reply
                </button>
              )}
              <button type="submit" disabled={submitting || !replyContent.trim()}>
                {submitting ? "Sending..." : "Send Reply"}
              </button>
            </form>
          )}

          {/* Replies List - Show loading only when loading for the first time */}
          {loadingReplies && !repliesLoaded ? (
            <div className="loading-replies">Loading replies...</div>
          ) : replies.length > 0 ? (
            <div className="replies-list">
              {replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  teamId={teamId}
                  feedbackId={feedback.id}
                  onReply={(parentId) => {
                    // This will trigger the nested reply form in ReplyItem
                    // No need to focus on the main form since it's hidden when replies exist
                  }}
                  onReplyAdded={() => {
                    setRepliesLoaded(false);
                    loadReplies();
                  }}
                  depth={0}
                  isLastInThread={false}
                  parentAuthor={null}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Recursive Reply Item Component (Reddit-style nesting with vertical flow)
function ReplyItem({ reply, teamId, feedbackId, onReply, onReplyAdded, depth, isLastInThread, parentAuthor }) {
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.post(`/api/team/${teamId}/feedback/${feedbackId}/replies`, {
        content: replyContent.trim(),
        parentReplyId: reply.id,
      });
      setReplyContent("");
      setReplying(false);
      await onReplyAdded();
    } catch (err) {
      console.error("Failed to submit reply:", err);
      alert(err.response?.data?.error || "Failed to submit reply");
    } finally {
      setSubmitting(false);
    }
  };

  const maxDepth = 5; // Prevent infinite nesting
  const canNest = depth < maxDepth;
  // Only show reply button if this reply has no nested replies (is a leaf node)
  // This ensures only the bottom-most reply in any branch has a reply button
  const hasNestedReplies = reply.replies && reply.replies.length > 0;
  const showReplyButton = canNest && !hasNestedReplies;

  return (
    <div className={`reply-item depth-${depth}`}>
      <div className="reply-header">
        <span className="reply-author">{reply.userName}</span>
        {parentAuthor && depth > 0 && (
          <span className="reply-to-indicator">replying to {parentAuthor}</span>
        )}
        <span className="reply-date">{formatDate(reply.createdAt)}</span>
        {reply.isMentor && <span className="reply-role-badge mentor">Mentor</span>}
        {reply.isCandidate && <span className="reply-role-badge candidate">Candidate</span>}
      </div>
      <div className="reply-content">{reply.content}</div>
      {showReplyButton && (
        <div className="reply-actions">
          <button
            onClick={() => {
              if (replying) {
                setReplying(false);
                setReplyContent("");
              } else {
                setReplying(true);
                onReply(reply.id);
              }
            }}
            className="reply-button"
          >
            {replying ? "Cancel" : "Reply"}
          </button>
        </div>
      )}

      {replying && (
        <form onSubmit={handleSubmitReply} className="nested-reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            required
            autoFocus
          />
          <button type="submit" disabled={submitting || !replyContent.trim()}>
            {submitting ? "Sending..." : "Send"}
          </button>
        </form>
      )}

      {/* Nested Replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="nested-replies">
          {reply.replies.map((nestedReply) => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              teamId={teamId}
              feedbackId={feedbackId}
              onReply={onReply}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
              isLastInThread={false}
              parentAuthor={reply.userName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// List View Component
function FeedbackListView({ feedbackList }) {
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

  return (
    <div className="feedback-list-view">
      {feedbackList.map((feedback) => (
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
                <span className="feedback-author">By: {feedback.mentorName}</span>
                <span className="feedback-date">{formatDate(feedback.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="feedback-content">{feedback.content}</div>
        </div>
      ))}
    </div>
  );
}