import React, { useEffect, useState } from "react";
import { api } from "../api";
import CertificationForm from "./CertificationForm";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CertificationSection({ token }) {
  const [certifications, setCertifications] = useState([]);
  const [certForm, setCertForm] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  async function loadCertifications() {
    try {
      const { data } = await api.get("/api/certifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCertifications(data.certifications || []);
    } catch (err) {
      console.error("Error loading certifications:", err);
    }
  }

  async function deleteCert(id) {
    if (!window.confirm("Delete this certification?")) return;
    await api.delete(`/api/certifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loadCertifications();
  }

  useEffect(() => {
    if (token) loadCertifications();
  }, [token]);

  // Get unique categories
  const categories = ["All", ...new Set(certifications.map((c) => c.category).filter(Boolean))];

  // Filter certifications
  const filtered = certifications.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.organization.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedByCategory = filtered.reduce((acc, cert) => {
    const category = cert.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(cert);
    return acc;
  }, {});

  return (
    <div className="profile-box">
      {!certForm && (
        <button className="btn-success" onClick={() => setCertForm({})}>
          ➕ Add Certification
        </button>
      )}

      {certForm && (
        <CertificationForm
          token={token}
          cert={certForm}
          onCancel={() => setCertForm(null)}
          onSaved={() => {
            setCertForm(null);
            loadCertifications();
          }}
        />
      )}

      {!certForm && certifications.length > 0 && (
        <>
          {/* Search and Filter */}
          <div style={{ marginTop: "1rem", marginBottom: "1rem", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search by name or organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd" }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd" }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {!certForm && (
        <>
          {filtered.length === 0 ? (
            <p>No certifications found. Add your first certification to get started!</p>
          ) : (
            // Display grouped by category
            Object.entries(groupedByCategory).map(([category, certs]) => (
              <div key={category} style={{ marginBottom: "32px" }}>
                <h4 style={{ 
                  fontSize: "18px", 
                  fontWeight: 600, 
                  marginBottom: "16px",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #8b5cf6"
                }}>
                  {category}
                </h4>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                  gap: "20px" 
                }}>
                  {certs.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        transition: "transform 0.2s, box-shadow 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      }}
                    >
                      {/* Certification File (Image or PDF) */}
                      {(c.badge_url || c.document_url) && (
                        <div style={{ textAlign: "center", marginBottom: "16px" }}>
                          {(() => {
                            const fileUrl = c.badge_url || c.document_url;
                            const isPdf = fileUrl.toLowerCase().endsWith(".pdf");
                            
                            if (isPdf) {
                              return (
                                <iframe
                                  src={`http://localhost:4000${fileUrl}#toolbar=0`}
                                  style={{
                                    width: "100%",
                                    maxWidth: "400px",
                                    height: "300px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                  }}
                                  title={`${c.name} PDF`}
                                />
                              );
                            } else {
                              return (
                                <img
                                  src={`http://localhost:4000${fileUrl}`}
                                  alt={`${c.name} certification`}
                                  style={{
                                    maxWidth: "150px",
                                    maxHeight: "150px",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    objectFit: "contain",
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              );
                            }
                          })()}
                        </div>
                      )}

                      {/* Certification Name & Organization */}
                      <h5 style={{ 
                        fontSize: "16px", 
                        fontWeight: 600, 
                        marginBottom: "8px",
                        color: "#1e293b"
                      }}>
                        {c.name}
                      </h5>
                      <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "12px" }}>
                        {c.organization}
                      </p>

                      {/* Dates */}
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                        <div>
                          <strong>Earned:</strong> {formatDate(c.date_earned)}
                        </div>
                        {!c.does_not_expire && c.expiration_date && (
                          <div>
                            <strong>Expires:</strong> {formatDate(c.expiration_date)}
                          </div>
                        )}
                        {c.does_not_expire && (
                          <div style={{ color: "#10b981" }}>✓ Does not expire</div>
                        )}
                      </div>

                      {/* Certification Number */}
                      {c.cert_number && (
                        <div style={{ fontSize: "13px", marginBottom: "8px" }}>
                          <strong>ID:</strong> {c.cert_number}
                        </div>
                      )}

                      {/* Scores */}
                      {c.scores && typeof c.scores === 'object' && (
                        <div style={{ 
                          background: "#f0f9ff", 
                          padding: "10px", 
                          borderRadius: "6px", 
                          marginBottom: "12px",
                          fontSize: "13px"
                        }}>
                          <strong>Assessment Scores:</strong>
                          <div style={{ marginTop: "8px" }}>
                            {c.scores.score && (
                              <div style={{ marginBottom: "4px" }}>
                                <strong>Score:</strong> {c.scores.score}
                              </div>
                            )}
                            {c.scores.percentile && (
                              <div style={{ marginBottom: "4px" }}>
                                <strong>Percentile:</strong> {c.scores.percentile}%
                              </div>
                            )}
                            {c.scores.skills_assessed && (
                              <div>
                                <strong>Skills Assessed:</strong>{" "}
                                {Array.isArray(c.scores.skills_assessed)
                                  ? c.scores.skills_assessed.join(", ")
                                  : c.scores.skills_assessed}
                              </div>
                            )}
                            {/* Display any other score fields */}
                            {Object.keys(c.scores).filter(key => !['score', 'percentile', 'skills_assessed'].includes(key)).map(key => (
                              <div key={key} style={{ marginBottom: "4px" }}>
                                <strong>{key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}:</strong>{" "}
                                {typeof c.scores[key] === 'object' ? JSON.stringify(c.scores[key]) : c.scores[key]}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {c.achievements && (
                        <div style={{ 
                          background: "#fef3c7", 
                          padding: "10px", 
                          borderRadius: "6px", 
                          marginBottom: "12px",
                          fontSize: "13px"
                        }}>
                          <strong>Achievements:</strong>
                          <p style={{ margin: "4px 0 0 0" }}>{c.achievements}</p>
                        </div>
                      )}

                      {/* Description */}
                      {c.description && (
                        <div style={{ 
                          marginBottom: "12px", 
                          fontSize: "13px", 
                          color: "#475569",
                          lineHeight: "1.5"
                        }}>
                          {c.description}
                        </div>
                      )}

                      {/* Verification URL */}
                      {c.verification_url && (
                        <div style={{ marginBottom: "12px" }}>
                          <a
                            href={c.verification_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#2563eb",
                              textDecoration: "none",
                              fontSize: "13px",
                              fontWeight: 500,
                            }}
                          >
                            🔗 Verify Certification →
                          </a>
                        </div>
                      )}


                      {/* Status */}
                      <div style={{ marginBottom: "12px", fontSize: "13px" }}>
                        {c.verified ? (
                          <span style={{ color: "#10b981", fontWeight: 500 }}>
                            ✅ Verified
                          </span>
                        ) : (
                          <span style={{ color: "#f59e0b" }}>
                            ⏳ Pending Verification
                          </span>
                        )}
                      </div>

                      {/* Renewal Reminder */}
                      {c.renewal_reminder && (
                        <div style={{ 
                          fontSize: "12px", 
                          color: "#dc2626",
                          marginBottom: "12px"
                        }}>
                          🔔 Renewal reminder: {formatDate(c.renewal_reminder)}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ 
                        display: "flex", 
                        gap: "8px", 
                        paddingTop: "12px", 
                        borderTop: "1px solid #e2e8f0" 
                      }}>
                        <button
                          className="btn-edit"
                          onClick={() => setCertForm(c)}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => deleteCert(c.id)}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 500,
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
