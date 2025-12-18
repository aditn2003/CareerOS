// src/components/GitHubSection.jsx
import { useState, useEffect } from "react";
import { api } from "../api";
import "./GitHubSection.css";
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaEye,
  FaSync,
  FaLink,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaLanguage,
  FaCalendarAlt,
  FaLock,
  FaArchive,
  FaCode,
  FaTag,
  FaPlus,
  FaTimes,
  FaChartLine,
} from "react-icons/fa";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function GitHubSection({ token }) {
  const [settings, setSettings] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [userSkills, setUserSkills] = useState([]);
  const [showSkillModal, setShowSkillModal] = useState(null); // repoId when modal is open
  const [selectedSkills, setSelectedSkills] = useState([]); // For skill linking modal
  const [contributions, setContributions] = useState([]);
  const [contributionPeriod, setContributionPeriod] = useState("30"); // days
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [updatingPrivateSetting, setUpdatingPrivateSetting] = useState(false);

  // Load settings and repositories on mount
  useEffect(() => {
    if (token) {
      loadSettings();
      loadRepositories();
      loadStats();
      loadUserSkills();
      loadContributions();
    }
  }, [token, contributionPeriod]);

  // Reload repositories when filters change
  useEffect(() => {
    if (token) {
      loadRepositories();
    }
  }, [filterFeatured, filterLanguage, sortBy, token]);

  async function loadSettings() {
    try {
      const { data } = await api.get("/api/github/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(data.settings);
      if (data.settings?.github_username) {
        setGithubUsername(data.settings.github_username);
      }
    } catch (err) {
      console.error("❌ Error loading GitHub settings:", err);
    }
  }

  async function loadRepositories() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterFeatured) params.append("featured", "true");
      if (filterLanguage) params.append("language", filterLanguage);
      if (sortBy) params.append("sort", sortBy);

      const { data } = await api.get(`/api/github/repositories?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRepositories(data.repositories || []);
    } catch (err) {
      console.error("❌ Error loading repositories:", err);
      setError(err.response?.data?.error || "Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const { data } = await api.get("/api/github/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(data.stats);
    } catch (err) {
      console.error("❌ Error loading GitHub stats:", err);
    }
  }

  async function loadUserSkills() {
    try {
      const { data } = await api.get("/skills", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserSkills(data.skills || []);
    } catch (err) {
      console.error("❌ Error loading user skills:", err);
    }
  }

  async function handleLinkSkills(repoId) {
    try {
      await api.post(
        `/api/github/repositories/${repoId}/skills`,
        { skill_ids: selectedSkills },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowSkillModal(null);
      setSelectedSkills([]);
      await loadRepositories(); // Reload to show updated skills
    } catch (err) {
      console.error("❌ Error linking skills:", err);
      setError(err.response?.data?.error || "Failed to link skills");
    }
  }

  async function handleUnlinkSkill(repoId, skillId) {
    try {
      await api.delete(`/api/github/repositories/${repoId}/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadRepositories(); // Reload to show updated skills
    } catch (err) {
      console.error("❌ Error unlinking skill:", err);
      setError(err.response?.data?.error || "Failed to unlink skill");
    }
  }

  function openSkillModal(repo) {
    setSelectedSkills(repo.linked_skills?.map((s) => s.id) || []);
    setShowSkillModal(repo.repository_id);
  }

  async function loadContributions() {
    if (!token) return;
    try {
      setLoadingContributions(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(contributionPeriod));

      const { data } = await api.get(
        `/api/github/contributions?start_date=${startDate.toISOString().split("T")[0]}&end_date=${endDate.toISOString().split("T")[0]}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("📊 Contribution data received:", data.contributions?.length || 0, "records");
      setContributions(data.contributions || []);
    } catch (err) {
      console.error("❌ Error loading contributions:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setContributions([]); // Ensure it's set to empty array on error
    } finally {
      setLoadingContributions(false);
    }
  }

  // Format contribution data for charts
  function formatContributionData() {
    if (!contributions || contributions.length === 0) return [];

    return contributions
      .map((c) => ({
        date: new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: c.date,
        commits: parseInt(c.total_commits || 0),
      }))
      .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }

  // Calculate contribution statistics
  function calculateContributionStats() {
    if (!contributions || contributions.length === 0) {
      return {
        totalCommits: 0,
        averageCommits: 0,
        activeDays: 0,
        longestStreak: 0,
      };
    }

    const totalCommits = contributions.reduce((sum, c) => sum + parseInt(c.total_commits || 0), 0);
    const activeDays = contributions.filter((c) => parseInt(c.total_commits || 0) > 0).length;
    const averageCommits = activeDays > 0 ? Math.round(totalCommits / activeDays) : 0;

    // Calculate longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    contributions
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((c) => {
        if (parseInt(c.total_commits || 0) > 0) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

    return {
      totalCommits,
      averageCommits,
      activeDays,
      longestStreak,
    };
  }

  async function handleConnect() {
    if (!githubUsername.trim()) {
      setError("Please enter a GitHub username");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.post(
        "/api/github/connect",
        { github_username: githubUsername.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      await loadSettings();
      
      // If reconnecting same account and repos exist, load them automatically
      if (data.is_reconnect && data.existing_repos > 0 && !data.sync_needed) {
        console.log(`✅ Reconnected same account with ${data.existing_repos} existing repositories`);
        await loadRepositories();
        await loadStats();
        alert(`✅ GitHub account reconnected! Found ${data.existing_repos} existing repositories. No sync needed.`);
      } else if (data.sync_needed) {
        alert("✅ GitHub account connected! Click 'Sync Repositories' to import your repositories.");
      }
      
      setShowConnectForm(false);
    } catch (err) {
      console.error("❌ Error connecting GitHub:", err);
      setError(err.response?.data?.error || "Failed to connect GitHub account");
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setError(null);
      const { data } = await api.post(
        "/api/github/sync",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadRepositories();
      await loadStats();
      // Small delay to allow backend to finish storing contributions
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadContributions(); // Reload contribution data after sync
      alert(`Sync completed! Added: ${data.summary.added}, Updated: ${data.summary.updated}. Contribution data has been updated.`);
    } catch (err) {
      console.error("❌ Error syncing repositories:", err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to sync repositories");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveToken() {
    if (!githubToken.trim()) {
      setError("Please enter a GitHub personal access token");
      return;
    }

    try {
      setSavingToken(true);
      setError(null);
      const { data } = await api.put(
        "/api/github/token",
        { github_token: githubToken.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowTokenInput(false);
      setGithubToken("");
      // Update settings with the returned data (includes has_token flag)
      if (data.settings) {
        setSettings(data.settings);
      } else {
        // Fallback: reload settings if not returned
        await loadSettings();
      }
      alert("✅ GitHub token saved successfully!");
    } catch (err) {
      console.error("❌ Error saving token:", err);
      setError(err.response?.data?.error || "Failed to save GitHub token");
    } finally {
      setSavingToken(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Are you sure you want to disconnect your GitHub account? This will remove your GitHub connection settings.")) {
      return;
    }

    try {
      setDisconnecting(true);
      setError(null);
      await api.delete("/api/github/disconnect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Reload settings (will be null after disconnect)
      await loadSettings();
      setRepositories([]);
      setStats(null);
      setContributions([]); // Clear contribution data
      alert("✅ GitHub account disconnected successfully");
    } catch (err) {
      console.error("❌ Error disconnecting GitHub:", err);
      setError(err.response?.data?.error || "Failed to disconnect GitHub account");
    } finally {
      setDisconnecting(false);
    }
  }

  async function toggleFeatured(repoId, currentStatus) {
    try {
      await api.put(
        `/api/github/repositories/${repoId}/feature`,
        { is_featured: !currentStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await loadRepositories();
      await loadStats();
    } catch (err) {
      console.error("❌ Error updating featured status:", err);
      setError(err.response?.data?.error || "Failed to update featured status");
    }
  }

  // Get unique languages from repositories
  const languages = [...new Set(repositories.map((r) => r.language).filter(Boolean))].sort();

  // Format date
  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  // Format languages object
  function formatLanguages(languagesObj) {
    if (!languagesObj) return [];
    if (typeof languagesObj === "string") {
      try {
        languagesObj = JSON.parse(languagesObj);
      } catch {
        return [];
      }
    }
    return Object.entries(languagesObj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([lang, percent]) => ({ lang, percent }));
  }

  if (!settings) {
    return (
      <div className="github-section">
        <div className="github-connect-card">
          <FaGithub className="github-icon-large" />
          <h4>Connect Your GitHub Account</h4>
          <p>Connect your GitHub account to import your repositories and showcase your projects.</p>

          {showConnectForm ? (
            <div className="github-connect-form">
              <input
                type="text"
                placeholder="Enter your GitHub username"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                className="github-username-input"
              />
              <div className="github-connect-actions">
                <button onClick={handleConnect} disabled={loading} className="btn-connect">
                  {loading ? <FaSpinner className="spinner" /> : "Connect"}
                </button>
                <button onClick={() => setShowConnectForm(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowConnectForm(true)} className="btn-connect-primary">
              Connect GitHub
            </button>
          )}

          {error && (
            <div className="github-error">
              <FaExclamationTriangle /> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="github-section">
      {/* Header with connection status and sync button */}
      <div className="github-header">
        <div className="github-connection-status">
          <FaCheckCircle className="status-icon connected" />
          <div>
            <strong>Connected as: {settings.github_username}</strong>
            {settings.last_sync_at && (
              <div className="last-sync">
                Last synced: {formatDate(settings.last_sync_at)}
              </div>
            )}
          </div>
        </div>
        <div className="github-header-actions">
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="btn-disconnect"
            title="Disconnect GitHub account"
            style={{
              background: "#fff5f5",
              color: "#dc3545",
              border: "1px solid #dc3545",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: disconnecting ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              marginRight: "10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {disconnecting ? (
              <>
                <FaSpinner className="spinner" /> Disconnecting...
              </>
            ) : (
              <>
                <FaTimesCircle /> Disconnect GitHub
              </>
            )}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-sync"
            title="Sync repositories from GitHub"
          >
            {syncing ? (
              <>
                <FaSpinner className="spinner" /> Syncing...
              </>
            ) : (
              <>
                <FaSync /> Sync Repositories
              </>
            )}
          </button>
        </div>
      </div>

      {/* GitHub Token Settings */}
      <div className="github-token-settings" style={{
        background: "#f6f8fa",
        border: "1px solid #e1e4e8",
        borderRadius: "6px",
        padding: "16px",
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600" }}>
              Personal Access Token (for Private Repos)
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#586069" }}>
              Add a GitHub personal access token to sync private repositories and increase API rate limits.
            </p>
          </div>
          {!showTokenInput && (
            <button
              onClick={() => setShowTokenInput(true)}
              className="btn-connect-primary"
              style={{ padding: "8px 16px", fontSize: "14px" }}
            >
              {settings.has_token ? "Update Token" : "Add Token"}
            </button>
          )}
        </div>
        
        {showTokenInput && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "500" }}>
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5da",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontFamily: "monospace",
                }}
              />
              <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#586069" }}>
                Create a token at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#0366d6" }}
                >
                  github.com/settings/tokens
                </a>
                . Required scopes: <code>repo</code> (for private repos)
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSaveToken}
                disabled={savingToken}
                className="btn-connect-primary"
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                {savingToken ? (
                  <>
                    <FaSpinner className="spinner" /> Saving...
                  </>
                ) : (
                  "Save Token"
                )}
              </button>
              <button
                onClick={() => {
                  setShowTokenInput(false);
                  setGithubToken("");
                }}
                className="btn-cancel"
                style={{ padding: "8px 16px", fontSize: "14px" }}
                disabled={savingToken}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {settings.has_token && !showTokenInput && (
          <div style={{
            marginTop: "12px",
            padding: "8px 12px",
            background: "#d1f2eb",
            border: "1px solid #a3e4d7",
            borderRadius: "4px",
            fontSize: "13px",
            color: "#0c5460",
          }}>
            <FaCheckCircle style={{ marginRight: "6px" }} />
            Token is configured
          </div>
        )}
      </div>

      {/* Private Repo Settings */}
      <div className="private-repo-settings" style={{
        background: "#f6f8fa",
        border: "1px solid #e1e4e8",
        borderRadius: "6px",
        padding: "16px",
        marginBottom: "20px",
      }}>
        <label className="private-repo-toggle" style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings?.include_private_repos || false}
            disabled={updatingPrivateSetting || !settings}
            onChange={async (e) => {
              const newValue = e.target.checked;
              
              if (newValue && !settings?.has_token) {
                setError("A GitHub personal access token is required to sync private repositories. Please add a token above first.");
                e.preventDefault();
                return;
              }
              
              setUpdatingPrivateSetting(true);
              
              // Optimistically update the UI immediately
              setSettings(prev => prev ? { ...prev, include_private_repos: newValue } : null);
              
              try {
                await api.put(
                  "/api/github/settings",
                  { include_private_repos: newValue },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                // Reload settings to ensure we have the latest from server
                await loadSettings();
                // Always reload repositories after changing the setting
                // If disabled, private repos will be removed from DB and filtered out
                // If enabled, private repos will be included
                await loadRepositories();
              } catch (err) {
                console.error("❌ Error updating private repo setting:", err);
                // Revert the optimistic update on error
                setSettings(prev => prev ? { ...prev, include_private_repos: !newValue } : null);
                setError(err.response?.data?.error || "Failed to update private repository setting");
              } finally {
                setUpdatingPrivateSetting(false);
              }
            }}
            style={{ 
              marginRight: "8px", 
              cursor: updatingPrivateSetting || !settings ? "not-allowed" : "pointer",
              opacity: updatingPrivateSetting ? 0.6 : 1
            }}
          />
          <span style={{ fontSize: "14px", fontWeight: "500" }}>Include Private Repositories</span>
        </label>
            {settings.include_private_repos && !settings.has_token && (
              <div className="private-repo-warning" style={{
                marginTop: "8px",
                padding: "8px 12px",
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#856404",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <FaExclamationTriangle /> Token required for private repos
              </div>
            )}
      </div>

      {error && (
        <div className="github-error">
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="github-stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.repositories.total}</div>
            <div className="stat-label">Repositories</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.repositories.featured}</div>
            <div className="stat-label">Featured</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.repositories.total_stars}</div>
            <div className="stat-label">Total Stars</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.contributions.total_commits}</div>
            <div className="stat-label">All-Time Commits</div>
          </div>
        </div>
      )}


      {/* Contribution Activity Section */}
      <div className="contribution-activity-section">
        {contributions && contributions.length > 0 ? (
          <>
          <div className="contribution-header">
            <h3>
              <FaChartLine className="contribution-icon" /> Contribution Activity
            </h3>
            <div className="contribution-period-selector">
              <label>
                Period:
                <select
                  value={contributionPeriod}
                  onChange={(e) => setContributionPeriod(e.target.value)}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </label>
            </div>
          </div>

          {loadingContributions ? (
            <div className="github-loading">
              <FaSpinner className="spinner" /> Loading contribution data...
            </div>
          ) : (
            <>
              {/* Contribution Statistics */}
              {(() => {
                const contribStats = calculateContributionStats();
                return (
                  <div className="contribution-stats-grid">
                    <div className="contribution-stat-card">
                      <div className="contribution-stat-value">{contribStats.totalCommits}</div>
                      <div className="contribution-stat-label">Commits (Period)</div>
                    </div>
                    <div className="contribution-stat-card">
                      <div className="contribution-stat-value">{contribStats.activeDays}</div>
                      <div className="contribution-stat-label">Active Days</div>
                    </div>
                    <div className="contribution-stat-card">
                      <div className="contribution-stat-value">{contribStats.averageCommits}</div>
                      <div className="contribution-stat-label">Avg Commits/Day</div>
                    </div>
                    <div className="contribution-stat-card">
                      <div className="contribution-stat-value">{contribStats.longestStreak}</div>
                      <div className="contribution-stat-label">Longest Streak</div>
                    </div>
                  </div>
                );
              })()}

              {/* Contribution Charts */}
              <div className="contribution-charts">
                <div className="contribution-chart-card">
                  <h4>Commits Over Time</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={formatContributionData()}>
                      <defs>
                        <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0366d6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#0366d6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
                      <XAxis
                        dataKey="date"
                        stroke="#586069"
                        fontSize={12}
                        tick={{ fill: "#586069" }}
                      />
                      <YAxis stroke="#586069" fontSize={12} tick={{ fill: "#586069" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e1e4e8",
                          borderRadius: "6px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="commits"
                        stroke="#0366d6"
                        fillOpacity={1}
                        fill="url(#colorCommits)"
                        name="Commits"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </>
          )}
        </>
        ) : (
          <div className="contribution-empty-state">
            <FaChartLine className="contribution-icon" style={{ fontSize: "3rem", color: "#d1d5da", marginBottom: "1rem" }} />
            <h3>No Contribution Data Available</h3>
            <p>
              Contribution data is collected automatically when you sync your repositories.
              If you've already synced, the data may still be processing, or your repositories may not have commits in the selected time period.
            </p>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button
                onClick={async () => {
                  try {
                    setLoadingContributions(true);
                    await loadContributions();
                  } catch (err) {
                    console.error("Error refreshing contributions:", err);
                  } finally {
                    setLoadingContributions(false);
                  }
                }}
                className="btn-sync"
                disabled={loadingContributions}
              >
                {loadingContributions ? (
                  <>
                    <FaSpinner className="spinner" /> Refreshing...
                  </>
                ) : (
                  <>
                    <FaSync /> Refresh Contribution Data
                  </>
                )}
              </button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#586069", marginTop: "1rem" }}>
              <strong>Tip:</strong> Check the browser console (F12) for detailed logs about contribution data collection.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="github-filters">
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={filterFeatured}
              onChange={(e) => setFilterFeatured(e.target.checked)}
              className="featured-filter-checkbox"
            />
            <span>Featured Only</span>
          </label>
        </div>
        <div className="filter-group">
          <label>
            Language:
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value="">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-group">
          <label>
            Sort By:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="updated">Last Updated</option>
              <option value="stars">Stars</option>
              <option value="created">Created Date</option>
              <option value="pushed">Last Pushed</option>
            </select>
          </label>
        </div>
      </div>

      {/* Repositories List */}
      {loading ? (
        <div className="github-loading">
          <FaSpinner className="spinner" /> Loading repositories...
        </div>
      ) : repositories
        .filter((r) => {
          if (filterFeatured) return r.is_featured;
          return true; // Show all repos (featured will be sorted to top)
        })
        .sort((a, b) => {
          // Sort featured repos to the top
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return 0;
        })
        .length === 0 ? (
        <div className="github-empty">
          <FaGithub className="github-icon-large" />
          <p>
            {filterFeatured
              ? "No featured repositories. Click the star icon on any repository to feature it."
              : "No repositories found. Click 'Sync Repositories' to import your GitHub repositories."}
          </p>
        </div>
      ) : (
        <div className="github-repositories-grid">
          {repositories
            .filter((r) => {
              // If filtering by featured, only show featured repos
              if (filterFeatured) return r.is_featured;
              // Show all repos (featured will be sorted to top)
              return true;
            })
            .sort((a, b) => {
              // Sort featured repos to the top
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
              return 0;
            })
            .map((repo) => {
            const repoLanguages = formatLanguages(repo.languages);
            return (
              <div key={repo.id} className={`github-repo-card ${repo.is_featured ? "featured" : ""}`}>
                <div className="repo-header">
                  <div className="repo-title-section">
                    <h4>
                      <FaCode className="repo-icon" />
                      {repo.name}
                    </h4>
                    {repo.is_private && <FaLock className="private-icon" title="Private" />}
                    {repo.is_archived && <FaArchive className="archived-icon" title="Archived" />}
                  </div>
                  <button
                    onClick={() => toggleFeatured(repo.repository_id, repo.is_featured)}
                    className={`btn-feature ${repo.is_featured ? "active" : ""}`}
                    title={repo.is_featured ? "Unfeature" : "Feature"}
                  >
                    {repo.is_featured ? <FaCheckCircle /> : <FaStar />}
                  </button>
                </div>

                {repo.description && <p className="repo-description">{repo.description}</p>}

                <div className="repo-stats">
                  <span className="repo-stat">
                    <FaStar /> {repo.stars_count}
                  </span>
                  <span className="repo-stat">
                    <FaCodeBranch /> {repo.forks_count}
                  </span>
                  <span className="repo-stat">
                    <FaEye /> {repo.watchers_count}
                  </span>
                </div>

                {repo.language && (
                  <div className="repo-language">
                    <FaLanguage /> {repo.language}
                  </div>
                )}

                {repoLanguages.length > 0 && (
                  <div className="repo-languages">
                    {repoLanguages.map(({ lang, percent }) => (
                      <span key={lang} className="language-tag">
                        {lang} ({percent}%)
                      </span>
                    ))}
                  </div>
                )}

                <div className="repo-meta">
                  <span className="repo-date">
                    <FaCalendarAlt /> Updated {formatDate(repo.updated_at)}
                  </span>
                </div>

                {/* Linked Skills */}
                {repo.linked_skills && repo.linked_skills.length > 0 && (
                  <div className="repo-linked-skills">
                    <strong>Linked Skills:</strong>
                    <div className="skill-tags">
                      {repo.linked_skills.map((skill) => (
                        <span key={skill.id} className="skill-tag">
                          {skill.name}
                          <button
                            className="skill-tag-remove"
                            onClick={() => handleUnlinkSkill(repo.repository_id, skill.id)}
                            title="Unlink skill"
                          >
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="repo-actions">
                  <button
                    onClick={() => openSkillModal(repo)}
                    className="btn-link-skills"
                    title="Link skills to this repository"
                  >
                    <FaTag /> {repo.linked_skills?.length > 0 ? "Edit Skills" : "Link Skills"}
                  </button>
                  {repo.html_url && (
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-repo-link"
                    >
                      <FaLink /> View on GitHub
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Selection Modal */}
      {showSkillModal && (
        <div className="github-modal-overlay" onClick={() => setShowSkillModal(null)}>
          <div className="skill-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Link Skills to Repository</h4>
            {userSkills.length === 0 ? (
              <p>No skills found. Please add skills to your profile first.</p>
            ) : (
              <>
                <div className="skill-modal-list">
                  {userSkills.map((skill) => (
                    <div key={skill.id} className="skill-modal-item">
                      <input
                        type="checkbox"
                        id={`skill-${skill.id}`}
                        checked={selectedSkills.includes(skill.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills([...selectedSkills, skill.id]);
                          } else {
                            setSelectedSkills(selectedSkills.filter((id) => id !== skill.id));
                          }
                        }}
                      />
                      <label htmlFor={`skill-${skill.id}`}>
                        {skill.name} {skill.category && `(${skill.category})`}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="skill-modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowSkillModal(null);
                      setSelectedSkills([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-connect-primary"
                    onClick={() => handleLinkSkills(showSkillModal)}
                  >
                    Link Skills
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

