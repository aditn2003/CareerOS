import React, { useState, useEffect } from "react";
import { getGoals, updateGoals, resetGoals } from "../api";

export default function GoalsSettings() {
  const [goals, setGoals] = useState({
    monthly_applications: 30,
    interview_rate_target: 0.30,
    offer_rate_target: 0.05,
  });
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      setLoading(true);
      const res = await getGoals();
      setGoals(res.data.goals);
      setIsCustom(res.data.isCustom);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");
      await updateGoals(goals);
      setIsCustom(true);
      setMessage("Goals saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save goals:", err);
      setMessage("Failed to save goals");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Reset goals to defaults?")) return;
    
    try {
      setSaving(true);
      const res = await resetGoals();
      setGoals(res.data.goals);
      setIsCustom(false);
      setMessage("Goals reset to defaults");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Failed to reset goals:", err);
      setMessage("Failed to reset goals");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={styles.container}>Loading goals...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Performance Goals</h3>
        {isCustom && <span style={styles.customBadge}>Custom</span>}
      </div>
      
      <p style={styles.description}>
        Set your personal job search targets. These goals will be reflected in your Performance Dashboard.
      </p>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Monthly Application Target
          <span style={styles.hint}>How many jobs do you want to apply to per month?</span>
        </label>
        <input
          type="number"
          min="1"
          max="200"
          value={goals.monthly_applications}
          onChange={(e) => setGoals({ ...goals, monthly_applications: parseInt(e.target.value) || 30 })}
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Interview Rate Target (%)
          <span style={styles.hint}>What percentage of applications should lead to interviews?</span>
        </label>
        <div style={styles.percentInput}>
          <input
            type="number"
            min="1"
            max="100"
            value={Math.round(goals.interview_rate_target * 100)}
            onChange={(e) => setGoals({ ...goals, interview_rate_target: (parseInt(e.target.value) || 30) / 100 })}
            style={styles.input}
          />
          <span style={styles.percentSign}>%</span>
        </div>
        <div style={styles.presets}>
          <button onClick={() => setGoals({ ...goals, interview_rate_target: 0.15 })} style={styles.presetBtn}>15%</button>
          <button onClick={() => setGoals({ ...goals, interview_rate_target: 0.25 })} style={styles.presetBtn}>25%</button>
          <button onClick={() => setGoals({ ...goals, interview_rate_target: 0.35 })} style={styles.presetBtn}>35%</button>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Offer Rate Target (%)
          <span style={styles.hint}>What percentage of applications should result in offers?</span>
        </label>
        <div style={styles.percentInput}>
          <input
            type="number"
            min="1"
            max="100"
            value={Math.round(goals.offer_rate_target * 100)}
            onChange={(e) => setGoals({ ...goals, offer_rate_target: (parseInt(e.target.value) || 5) / 100 })}
            style={styles.input}
          />
          <span style={styles.percentSign}>%</span>
        </div>
        <div style={styles.presets}>
          <button onClick={() => setGoals({ ...goals, offer_rate_target: 0.03 })} style={styles.presetBtn}>3%</button>
          <button onClick={() => setGoals({ ...goals, offer_rate_target: 0.05 })} style={styles.presetBtn}>5%</button>
          <button onClick={() => setGoals({ ...goals, offer_rate_target: 0.10 })} style={styles.presetBtn}>10%</button>
        </div>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes("success") || message.includes("reset") ? "#dcfce7" : "#fee2e2",
          color: message.includes("success") || message.includes("reset") ? "#166534" : "#991b1b",
        }}>
          {message}
        </div>
      )}

      <div style={styles.buttonGroup}>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? "Saving..." : "Save Goals"}
        </button>
        <button onClick={handleReset} disabled={saving} style={styles.resetBtn}>
          Reset to Defaults
        </button>
      </div>

      <div style={styles.infoBox}>
        <strong>Default Goals:</strong>
        <ul style={styles.infoList}>
          <li>30 applications per month</li>
          <li>30% interview rate (industry average: 10-20%)</li>
          <li>5% offer rate (industry average: 2-5%)</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    maxWidth: "500px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
  },
  customBadge: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "9999px",
  },
  description: {
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "6px",
    fontSize: "14px",
  },
  hint: {
    display: "block",
    fontWeight: "400",
    color: "#9ca3af",
    fontSize: "12px",
    marginTop: "2px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  percentInput: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  percentSign: {
    position: "absolute",
    right: "12px",
    color: "#6b7280",
    fontWeight: "500",
  },
  presets: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  presetBtn: {
    padding: "4px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    backgroundColor: "#f9fafb",
    color: "#4b5563",
    fontSize: "12px",
    cursor: "pointer",
  },
  message: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
    fontWeight: "500",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  resetBtn: {
    padding: "12px 16px",
    backgroundColor: "transparent",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  infoBox: {
    marginTop: "24px",
    padding: "16px",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#4b5563",
  },
  infoList: {
    margin: "8px 0 0 0",
    paddingLeft: "20px",
  },
};

