import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCompanyResearch, api } from "../../api";
import CompanyResearchCard from "../../components/CompanyResearchCard";
import "./CompanyResearch.css";

export default function CompanyResearch() {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [researchResults, setResearchResults] = useState({});
  const [activeCompany, setActiveCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // 📰 News UI state (UC-064)
  const [newsCategory, setNewsCategory] = useState("All");
  const [newsSearch, setNewsSearch] = useState("");
  const [newsSort, setNewsSort] = useState("relevance"); // 'relevance' | 'date'

  /* 🧭 Fetch job companies */
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/jobs");
        const uniqueCompanies = [
          ...new Set(res.data.jobs.map((job) => job.company?.trim()).filter(Boolean)),
        ];
        setCompanies(uniqueCompanies);
        
        // Check for company from URL query params (from Interview Tracker)
        const companyFromUrl = searchParams.get("company");
        if (companyFromUrl && uniqueCompanies.includes(companyFromUrl)) {
          setActiveCompany(companyFromUrl);
        } else if (uniqueCompanies.length > 0) {
          setActiveCompany(uniqueCompanies[0]);
        }
      } catch (err) {
        setError("Failed to fetch jobs.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [searchParams]);

  /* ⚡ Fetch research data */
  const fetchResearchData = async (company, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const data = await fetchCompanyResearch(company, isRefresh);
      setResearchResults((prev) => ({ ...prev, [company]: data }));
    } catch (err) {
      console.error(err);
      setResearchResults((prev) => ({
        ...prev,
        [company]: { error: err.message },
      }));
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (companies.length === 0) return;
      setLoading(true);
      await Promise.all(companies.map((c) => fetchResearchData(c)));
      setLoading(false);
    };
    fetchAll();
  }, [companies]);

  const handleRefresh = async () => {
    if (!activeCompany) return;
    await fetchResearchData(activeCompany, true);
  };

  // ✅ Safe conditional flags
  const showError = !!error;
  const showEmpty = !error && companies.length === 0;

  const currentData = researchResults[activeCompany] || {};

  // ✅ Always an array, never breaks Hook order
  const recentNews = Array.isArray(currentData?.recentNews)
    ? currentData.recentNews
    : Array.isArray(currentData?.news)
    ? currentData.news
    : [];

  const newsRefreshKey = `${activeCompany}-${recentNews.length}`;

  // 🧮 Build category chips with counts
  const categoryCounts = useMemo(() => {
    const counts = { All: recentNews.length };
    recentNews.forEach((n) => {
      const cat = n.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const order = [
      "All",
      "Funding",
      "Product Launch",
      "Hiring",
      "Partnership",
      "Legal",
      "Acquisition",
      "Financial",
      "Event",
      "General",
    ];
    return order
      .filter((k) => counts[k] > 0 || k === "All")
      .map((k) => ({ name: k, count: counts[k] || 0 }));
  }, [recentNews, newsRefreshKey]);

  // 🔍 Filter + sort news
  const filteredNews = useMemo(() => {
    let items = recentNews.slice();

    if (newsCategory !== "All") {
      items = items.filter((n) => (n.category || "General") === newsCategory);
    }
    if (newsSearch.trim()) {
      const q = newsSearch.toLowerCase();
      items = items.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.summary?.toLowerCase().includes(q) ||
          n.source?.toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => {
      if (newsSort === "relevance") {
        const ra = Number(a.relevance_score ?? 0);
        const rb = Number(b.relevance_score ?? 0);
        if (rb !== ra) return rb - ra;
        return (
          new Date(b.date || b.publishedAt || 0) -
          new Date(a.date || a.publishedAt || 0)
        );
      } else {
        return (
          new Date(b.date || b.publishedAt || 0) -
          new Date(a.date || a.publishedAt || 0)
        );
      }
    });

    return items;
  }, [recentNews, newsCategory, newsSearch, newsSort, newsRefreshKey]);

  // ⬇️ Client-side CSV export
  const exportNewsCSV = () => {
    const rows = [
      [
        "Company",
        "Title",
        "Category",
        "Source",
        "Date",
        "Relevance",
        "URL",
        "Summary",
        "Key Points",
      ],
      ...filteredNews.map((n) => [
        activeCompany,
        n.title || "",
        n.category || "General",
        n.source || "",
        n.date || n.publishedAt || "",
        (n.relevance_score ?? "").toString(),
        n.url || "",
        (n.summary || "").replace(/\n/g, " "),
        Array.isArray(n.key_points) ? n.key_points.join(" | ") : "",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s)
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `${activeCompany.replace(/\s+/g, "_")}_news_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // 🎚️ Relevance indicator
  const RelevanceBar = ({ score = 0 }) => (
    <div
      className="rel-wrap"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <div
        style={{
          height: 6,
          width: 90,
          background: "var(--muted-bg, #eee)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, Math.round((score || 0) * 100)))}%`,
            background: "linear-gradient(90deg, #6ee7b7, #10b981)",
          }}
        />
      </div>
      <span style={{ fontSize: 12, opacity: 0.8 }}>
        {Math.round((score || 0) * 100)}%
      </span>
    </div>
  );

  // 🧩 Conditional — handle no jobs early
if (companies.length === 0 && !loading) {
  return (
    <div className="research-wrapper">
      <h1 className="research-header">Automated Company Research</h1>
      <p className="no-data">No companies found in your Jobs tab yet.</p>
    </div>
  );
}

return (
  <div className="research-wrapper">
    <h1 className="research-header">Automated Company Research</h1>


      {/* 🧭 Company Navbar */}
      <div className="company-nav">
        {companies.map((company) => (
          <button
            key={company}
            className={`company-tab ${
              activeCompany === company ? "active" : ""
            }`}
            onClick={() => {
              setActiveCompany(company);
              setNewsCategory("All");
              setNewsSearch("");
              setNewsSort("relevance");
            }}
          >
            {company}
          </button>
        ))}
      </div>

      {/* 🔄 Refresh Button + 🌀 Loading Indicator */}
      <div className="refresh-container">
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          {refreshing ? "Refreshing..." : "🔁 Refresh Research"}
        </button>

        {(loading || refreshing) && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span className="loading-text">
              {refreshing
                ? "Updating company insights..."
                : "Fetching company research..."}
            </span>
          </div>
        )}
      </div>

      {/* 🧾 Animated Company Data */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCompany}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }}
          className="company-content"
        >
          <h2 className="company-title">
            {activeCompany}
            <span className="verify-badge">✅ Verified + AI Enriched</span>
          </h2>

          {/* 🧠 Company Research Card */}
          <CompanyResearchCard
            data={currentData}
            loading={!currentData}
            error={currentData?.error}
          />

          {/* =========================
              📰 Recent News & Updates
             ========================= */}
          <div className="news-section">
            <div className="news-header-row">
              <h3 className="news-title">📰 Recent Company News & Updates</h3>

              <div className="news-actions">
                <input
                  type="text"
                  className="news-search"
                  placeholder="Search news..."
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                />
                <select
                  className="news-sort"
                  value={newsSort}
                  onChange={(e) => setNewsSort(e.target.value)}
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="date">Sort: Newest</option>
                </select>
                <button
                  className="export-btn"
                  onClick={exportNewsCSV}
                  disabled={(filteredNews?.length || 0) === 0}
                  title="Export visible news as CSV"
                >
                  ⬇️ Export
                </button>
              </div>
            </div>

            {/* 🏷️ Category Filters */}
            <div className="news-categories">
              {categoryCounts.map(({ name, count }) => (
                <button
                  key={name}
                  className={`news-chip ${
                    newsCategory === name ? "active" : ""
                  }`}
                  onClick={() => setNewsCategory(name)}
                >
                  {name} <span className="chip-count">{count}</span>
                </button>
              ))}
            </div>

            {/* 📰 News List */}
            {filteredNews.length === 0 ? (
              <p className="no-news">No news found for the selected filters.</p>
            ) : (
              <div className="news-list">
                {filteredNews.map((n, idx) => (
                  <div key={idx} className="news-card">
                    <div className="news-card-top">
                      <a
                        href={n.url}
                        className="news-headline"
                        target="_blank"
                        rel="noreferrer"
                        title={n.title}
                      >
                        {n.title}
                      </a>
                      <span
                        className={`news-badge cat-${(n.category || "General").replace(
                          /\s+/g,
                          "-"
                        )}`}
                      >
                        {n.category || "General"}
                      </span>
                    </div>

                    <div className="news-meta">
                      <span className="news-source">
                        {n.source || "Source"}
                      </span>
                      <span className="news-dot">•</span>
                      <span className="news-date">
                        {n.date || n.publishedAt
                          ? new Date(
                              n.date || n.publishedAt
                            ).toLocaleDateString()
                          : "Unknown date"}
                      </span>
                      <span className="news-dot">•</span>
                      <RelevanceBar score={Number(n.relevance_score ?? 0)} />
                    </div>

                    {n.summary && (
                      <p className="news-summary">{n.summary}</p>
                    )}

                    {Array.isArray(n.key_points) &&
                      n.key_points.length > 0 && (
                        <ul className="news-points">
                          {n.key_points.slice(0, 3).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 🧩 Conditional messages (safe for hooks) */}
      {showError && <p className="error-text">{error}</p>}
      {showEmpty && (
        <p className="no-data">No companies found in your Jobs tab yet.</p>
      )}
    </div>
  );
}
