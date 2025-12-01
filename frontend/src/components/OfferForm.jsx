import React, { useState, useEffect } from "react";
import { createOffer, updateOffer, getJobs } from "../api";

export default function OfferForm({ offer, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    company: offer?.company || "",
    role_title: offer?.role_title || "",
    role_level: offer?.role_level || "mid",
    location: offer?.location || "",
    location_type: offer?.location_type || "on_site",
    industry: offer?.industry || "",
    company_size: offer?.company_size || "medium",
    base_salary: offer?.base_salary || "",
    signing_bonus: offer?.signing_bonus || 0,
    annual_bonus_percent: offer?.annual_bonus_percent || 0,
    annual_bonus_guaranteed: offer?.annual_bonus_guaranteed || false,
    equity_type: offer?.equity_type || "none",
    equity_value: offer?.equity_value || 0,
    equity_vesting_schedule: offer?.equity_vesting_schedule || "",
    pto_days: offer?.pto_days || 0,
    health_insurance_value: offer?.health_insurance_value || 0,
    retirement_match_percent: offer?.retirement_match_percent || 0,
    other_benefits_value: offer?.other_benefits_value || 0,
    offer_date: offer?.offer_date || new Date().toISOString().split('T')[0],
    expiration_date: offer?.expiration_date || "",
    offer_status: offer?.offer_status || "pending",
    years_of_experience: offer?.years_of_experience || "",
    job_id: offer?.job_id || null
  });

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await getJobs();
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error("Error loading jobs:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (offer?.id) {
        await updateOffer(offer.id, formData);
      } else {
        await createOffer(formData);
      }
      onSave();
    } catch (err) {
      console.error("Error saving offer:", err);
      alert("Failed to save offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3>{offer ? "Edit Offer" : "Add New Offer"}</h3>
      
      <div style={styles.section}>
        <h4>Role Details</h4>
        <select 
          name="job_id" 
          value={formData.job_id || ""} 
          onChange={handleChange}
          style={styles.input}
        >
          <option value="">Select Job (Optional)</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>
              {job.company} - {job.title}
            </option>
          ))}
        </select>
        <input
          name="company"
          placeholder="Company *"
          value={formData.company}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          name="role_title"
          placeholder="Role Title *"
          value={formData.role_title}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <select name="role_level" value={formData.role_level} onChange={handleChange} style={styles.input}>
          <option value="intern">Intern</option>
          <option value="entry">Entry</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
          <option value="principal">Principal</option>
          <option value="lead">Lead</option>
          <option value="manager">Manager</option>
          <option value="director">Director</option>
          <option value="vp">VP</option>
        </select>
        <input
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
          style={styles.input}
        />
        <select name="location_type" value={formData.location_type} onChange={handleChange} style={styles.input}>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on_site">On-Site</option>
          <option value="flexible">Flexible</option>
        </select>
        <input
          name="industry"
          placeholder="Industry"
          value={formData.industry}
          onChange={handleChange}
          style={styles.input}
        />
        <select name="company_size" value={formData.company_size} onChange={handleChange} style={styles.input}>
          <option value="startup">Startup</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div style={styles.section}>
        <h4>Compensation</h4>
        <input
          type="number"
          name="base_salary"
          placeholder="Base Salary *"
          value={formData.base_salary}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="number"
          name="signing_bonus"
          placeholder="Signing Bonus"
          value={formData.signing_bonus}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="number"
          step="0.1"
          name="annual_bonus_percent"
          placeholder="Annual Bonus %"
          value={formData.annual_bonus_percent}
          onChange={handleChange}
          style={styles.input}
        />
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            name="annual_bonus_guaranteed"
            checked={formData.annual_bonus_guaranteed}
            onChange={handleChange}
          />
          Bonus Guaranteed
        </label>
      </div>

      <div style={styles.section}>
        <h4>Equity</h4>
        <select name="equity_type" value={formData.equity_type} onChange={handleChange} style={styles.input}>
          <option value="none">None</option>
          <option value="stock_options">Stock Options</option>
          <option value="rsu">RSU</option>
          <option value="restricted_stock">Restricted Stock</option>
        </select>
        <input
          type="number"
          name="equity_value"
          placeholder="Equity Value ($)"
          value={formData.equity_value}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="equity_vesting_schedule"
          placeholder="Vesting Schedule (e.g., 4 years, 1 year cliff)"
          value={formData.equity_vesting_schedule}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.section}>
        <h4>Benefits</h4>
        <input
          type="number"
          name="pto_days"
          placeholder="PTO Days"
          value={formData.pto_days}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="number"
          name="health_insurance_value"
          placeholder="Health Insurance Annual Value ($)"
          value={formData.health_insurance_value}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="number"
          step="0.1"
          name="retirement_match_percent"
          placeholder="Retirement Match %"
          value={formData.retirement_match_percent}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          type="number"
          name="other_benefits_value"
          placeholder="Other Benefits Value ($)"
          value={formData.other_benefits_value}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.section}>
        <h4>Offer Details</h4>
        <input
          type="date"
          name="offer_date"
          value={formData.offer_date}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="date"
          name="expiration_date"
          value={formData.expiration_date}
          onChange={handleChange}
          style={styles.input}
        />
        <select name="offer_status" value={formData.offer_status} onChange={handleChange} style={styles.input}>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <input
          type="number"
          step="0.1"
          name="years_of_experience"
          placeholder="Years of Experience"
          value={formData.years_of_experience}
          onChange={handleChange}
          style={styles.input}
        />
      </div>

      <div style={styles.actions}>
        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Saving..." : (offer ? "Update Offer" : "Create Offer")}
        </button>
        <button type="button" onClick={onCancel} style={styles.cancelBtn}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px'
  },
  submitBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

