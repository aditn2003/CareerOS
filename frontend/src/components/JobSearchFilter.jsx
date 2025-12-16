// key points: debounce, stable callback, and no early returns
import "./JobSearchFilter.css";
import React, { useEffect, useMemo, useState } from "react";

export default function JobSearchFilter({ onFilterChange, savedPreferences }) {
  const [search, setSearch] = useState(savedPreferences?.search ?? "");
  const [filters, setFilters] = useState({
    status: savedPreferences?.status ?? "",
    industry: savedPreferences?.industry ?? "",
    location: savedPreferences?.location ?? "",
    salaryMin: savedPreferences?.salaryMin ?? "",
    salaryMax: savedPreferences?.salaryMax ?? "",
    dateFrom: savedPreferences?.dateFrom ?? "",
    dateTo: savedPreferences?.dateTo ?? "",
    sortBy: savedPreferences?.sortBy ?? "date_added",
  });

  const payload = useMemo(() => ({ ...filters, search }), [filters, search]);

  // 🔁 Debounce filter updates
  useEffect(() => {
    const t = setTimeout(() => onFilterChange?.(payload), 450);
    return () => clearTimeout(t);
  }, [payload, onFilterChange]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  }

  // 🧠 Save and Load handlers
  function handleSaveSearch() {
    localStorage.setItem("savedJobSearch", JSON.stringify(payload));
    alert("✅ Search preferences saved!");
  }

  function handleLoadSearch() {
    const saved = JSON.parse(localStorage.getItem("savedJobSearch") || "{}");
    if (Object.keys(saved).length === 0)
      return alert("⚠️ No saved search found");
    setFilters({
      status: saved.status || "",
      industry: saved.industry || "",
      location: saved.location || "",
      salaryMin: saved.salaryMin || "",
      salaryMax: saved.salaryMax || "",
      dateFrom: saved.dateFrom || "",
      dateTo: saved.dateTo || "",
      sortBy: saved.sortBy || "date_added",
    });
    setSearch(saved.search || "");
    onFilterChange?.(saved);
    alert("✅ Loaded saved search preferences!");
  }

  return (
    <div className="job-filter-card">
      {/* 🔍 Search Row */}
      <div className="search-row">
        <input
          type="text"
          placeholder="🔍 Search by title, company, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search jobs by title, company, or keyword"
        />

        <div className="filter-buttons">
          <button
            type="button"
            onClick={() => {
              const cleared = {
                status: "",
                industry: "",
                location: "",
                salaryMin: "",
                salaryMax: "",
                dateFrom: "",
                dateTo: "",
                sortBy: "date_added",
              };
              setFilters(cleared);
              setSearch("");
              onFilterChange?.({ ...cleared, search: "" });
            }}
          >
            Clear
          </button>

          <button type="button" onClick={handleSaveSearch}>
            💾 Save
          </button>

          <button type="button" onClick={handleLoadSearch}>
            🔁 Load
          </button>
        </div>
      </div>

      {/* 🧭 Filter Grid */}
      <div className="filter-grid">
        <select 
          name="status" 
          value={filters.status} 
          onChange={handleChange}
          aria-label="Filter by job status"
        >
          <option value="">All Stages</option>
          <option>Interested</option>
          <option>Applied</option>
          <option>Phone Screen</option>
          <option>Interview</option>
          <option>Offer</option>
          <option>Rejected</option>
        </select>

        <input
          name="industry"
          placeholder="Industry"
          value={filters.industry}
          onChange={handleChange}
          aria-label="Filter by industry"
        />
        <input
          name="location"
          placeholder="Location"
          value={filters.location}
          onChange={handleChange}
          aria-label="Filter by location"
        />
        <input
          type="number"
          name="salaryMin"
          placeholder="Min Salary"
          value={filters.salaryMin}
          onChange={handleChange}
          aria-label="Minimum salary filter"
        />
        <input
          type="number"
          name="salaryMax"
          placeholder="Max Salary"
          value={filters.salaryMax}
          onChange={handleChange}
          aria-label="Maximum salary filter"
        />

        <div className="date-range">
          <label htmlFor="dateFrom">Deadline: </label>
          <input
            type="date"
            id="dateFrom"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleChange}
            aria-label="Deadline start date"
          />
          <label htmlFor="dateTo">to</label>
          <input
            type="date"
            id="dateTo"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleChange}
            aria-label="Deadline end date"
          />
        </div>

        <select 
          name="sortBy" 
          value={filters.sortBy} 
          onChange={handleChange}
          aria-label="Sort jobs by"
        >
          <option value="date_added">Sort: Date Added</option>
          <option value="deadline">Deadline</option>
          <option value="salary">Salary</option>
          <option value="company">Company</option>
        </select>
      </div>
    </div>
  );
}
