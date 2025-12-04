import React, { useState, useEffect } from "react";
import { createOffer, updateOffer, getJobs, recordNegotiation } from "../api";

export default function OfferForm({ offer, onSave, onCancel }) {
  // Initialize initial_base_salary: for new offers, use base_salary; for existing, use initial_base_salary or base_salary
  const initialSalary = offer?.initial_base_salary || offer?.base_salary || "";
  
  const [formData, setFormData] = useState({
    company: offer?.company || "",
    role_title: offer?.role_title || "",
    role_level: offer?.role_level || "mid",
    location: offer?.location || "",
    location_type: offer?.location_type || "on_site",
    industry: offer?.industry || "",
    company_size: offer?.company_size || "medium",
    base_salary: offer?.base_salary || "",
    initial_base_salary: initialSalary, // Track initial offer
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
    job_id: offer?.job_id || null,
    negotiation_notes: offer?.negotiation_notes || ""
  });

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNegotiationSection, setShowNegotiationSection] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  // When job_id changes, auto-populate form with job data
  useEffect(() => {
    if (formData.job_id && !offer?.id) {
      const selectedJob = jobs.find(j => j.id === parseInt(formData.job_id));
      if (selectedJob) {
        const defaultSalary = selectedJob.salary_min || "";
        setFormData(prev => ({
          ...prev,
          company: prev.company || selectedJob.company || "",
          role_title: prev.role_title || selectedJob.title || "",
          location: prev.location || selectedJob.location || "",
          industry: prev.industry || selectedJob.industry || "",
          // Use salary_min as default base_salary, but allow editing
          base_salary: prev.base_salary || defaultSalary,
          // Set initial_base_salary to the same value for new offers
          initial_base_salary: prev.initial_base_salary || defaultSalary,
          // Keep other fields as they are (user may have already filled them)
        }));
      }
    }
  }, [formData.job_id, jobs, offer]);

  // Calculate negotiation improvement percentage
  const calculateImprovement = () => {
    const initial = Number(formData.initial_base_salary) || 0;
    const current = Number(formData.base_salary) || 0;
    if (initial > 0 && current > initial) {
      return ((current - initial) / initial) * 100;
    }
    return 0;
  };

  const improvementPercent = calculateImprovement();
  const hasNegotiation = improvementPercent > 0 || (offer?.id && offer?.negotiation_attempted);

  const loadJobs = async () => {
    try {
      const res = await getJobs();
      // Filter to show jobs with status "Offer" first, then others
      const allJobs = res.data.jobs || [];
      const jobsWithOffers = allJobs.filter(j => j.status === "Offer" || j.status === "offer");
      const otherJobs = allJobs.filter(j => j.status !== "Offer" && j.status !== "offer");
      setJobs([...jobsWithOffers, ...otherJobs]);
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
      let savedOffer;
      if (offer?.id) {
        // Update existing offer
        const updateData = { ...formData };
        // If base_salary changed from initial, mark as negotiated
        const initial = Number(formData.initial_base_salary) || Number(offer.initial_base_salary) || Number(offer.base_salary) || 0;
        const current = Number(formData.base_salary) || 0;
        
        // If there are negotiation notes, mark as attempted
        if (formData.negotiation_notes && formData.negotiation_notes.trim().length > 0) {
          updateData.negotiation_attempted = true;
        }
        
        if (current > initial && initial > 0) {
          // There's a salary increase - record as successful negotiation
          updateData.negotiation_successful = true;
          updateData.negotiated_base_salary = current;
          updateData.negotiation_improvement_percent = ((current - initial) / initial) * 100;
        }
        
        const response = await updateOffer(offer.id, updateData);
        savedOffer = response.data.offer || response.data;
        
        // If there are negotiation notes, record in negotiation_history
        if (formData.negotiation_notes && formData.negotiation_notes.trim().length > 0) {
          try {
            await recordNegotiation(offer.id, {
              negotiated_base_salary: current || initial,
              negotiation_notes: formData.negotiation_notes,
              negotiation_type: 'base_salary',
              value_before: initial,
              value_after: current || initial,
              outcome: current > initial ? 'success' : 'attempted'
            });
          } catch (negErr) {
            console.error("Error recording negotiation:", negErr);
            // Don't fail the whole save if negotiation recording fails
          }
        }
      } else {
        // Create new offer
        const createData = { ...formData };
        // For new offers, set initial_base_salary to base_salary if not already set
        if (!createData.initial_base_salary && createData.base_salary) {
          createData.initial_base_salary = createData.base_salary;
        }
        const response = await createOffer(createData);
        savedOffer = response.data.offer || response.data;
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
              {job.salary_min || job.salary_max 
                ? ` ($${job.salary_min || '?'}k - $${job.salary_max || '?'}k)`
                : ''}
              {job.status === "Offer" || job.status === "offer" ? " [Has Offer]" : ""}
            </option>
          ))}
        </select>
        {formData.job_id && (() => {
          const selectedJob = jobs.find(j => j.id === parseInt(formData.job_id));
          return selectedJob && (selectedJob.salary_min || selectedJob.salary_max) ? (
            <div style={styles.hint}>
              💡 Salary range from job posting: ${selectedJob.salary_min || '?'}k - ${selectedJob.salary_max || '?'}k
              {formData.base_salary === selectedJob.salary_min ? (
                <span style={{ color: '#10b981', marginLeft: '8px' }}>
                  (Using minimum as default - you can edit)
                </span>
              ) : null}
            </div>
          ) : null;
        })()}
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
        {offer?.id && formData.initial_base_salary && (
          <div style={styles.initialSalaryInfo}>
            <span style={styles.label}>Initial Offer:</span>
            <span style={styles.initialSalaryValue}>${Number(formData.initial_base_salary).toLocaleString()}</span>
          </div>
        )}
        <div>
          <label style={styles.label}>
            {offer?.id ? "Negotiated Base Salary" : "Base Salary"} *
          </label>
          <input
            type="number"
            name="base_salary"
            placeholder="Base Salary *"
            value={formData.base_salary}
            onChange={handleChange}
            required
            style={styles.input}
          />
          {improvementPercent > 0 && (
            <div style={styles.improvementBadge}>
              ✨ Negotiated +{improvementPercent.toFixed(1)}% improvement
            </div>
          )}
          {formData.job_id && (() => {
            const selectedJob = jobs.find(j => j.id === parseInt(formData.job_id));
            if (selectedJob && (selectedJob.salary_min || selectedJob.salary_max)) {
              return (
                <div style={styles.salaryHint}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        base_salary: selectedJob.salary_min || ""
                      }));
                    }}
                    style={styles.useMinBtn}
                  >
                    Use Min (${selectedJob.salary_min?.toLocaleString() || 'N/A'})
                  </button>
                  {selectedJob.salary_max && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          base_salary: selectedJob.salary_max || ""
                        }));
                      }}
                      style={styles.useMaxBtn}
                    >
                      Use Max (${selectedJob.salary_max?.toLocaleString() || 'N/A'})
                    </button>
                  )}
                  {selectedJob.salary_min && selectedJob.salary_max && (
                    <button
                      type="button"
                      onClick={() => {
                        const mid = Math.round((selectedJob.salary_min + selectedJob.salary_max) / 2);
                        setFormData(prev => ({
                          ...prev,
                          base_salary: mid
                        }));
                      }}
                      style={styles.useMidBtn}
                    >
                      Use Mid (${Math.round((selectedJob.salary_min + selectedJob.salary_max) / 2).toLocaleString()})
                    </button>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
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

      {/* Negotiation Section - Always visible */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h4>💬 Negotiation Details</h4>
          {!showNegotiationSection && !formData.negotiation_notes && (
            <button
              type="button"
              onClick={() => setShowNegotiationSection(true)}
              style={styles.toggleBtn}
            >
              Add Negotiation Notes
            </button>
          )}
        </div>
        {(showNegotiationSection || formData.negotiation_notes || offer?.id) && (
          <div>
            <label style={styles.label}>
              Negotiation Notes
              <span style={styles.hintText}>
                {" "}(e.g., "Asked for 10% increase, mentioned competing offer, got 8% increase")
              </span>
            </label>
            <textarea
              name="negotiation_notes"
              placeholder="Record your negotiation strategy, talking points, leverage used, and outcome..."
              value={formData.negotiation_notes}
              onChange={handleChange}
              rows={4}
              style={styles.textarea}
            />
            {improvementPercent > 0 && (
              <div style={styles.negotiationSummary}>
                <div style={styles.summaryRow}>
                  <span>Initial Offer:</span>
                  <strong>${Number(formData.initial_base_salary).toLocaleString()}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Negotiated Salary:</span>
                  <strong style={{ color: '#10b981' }}>
                    ${Number(formData.base_salary).toLocaleString()}
                  </strong>
                </div>
                <div style={{ ...styles.summaryRow, borderBottom: 'none' }}>
                  <span>Improvement:</span>
                  <strong style={{ color: '#10b981' }}>
                    +{improvementPercent.toFixed(1)}% (+${(Number(formData.base_salary) - Number(formData.initial_base_salary)).toLocaleString()})
                  </strong>
                </div>
              </div>
            )}
            {offer?.id && formData.initial_base_salary && !improvementPercent && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', fontSize: '14px', color: '#6b7280' }}>
                💡 <strong>Tip:</strong> If you negotiate and get a higher salary, update the "Base Salary" field above. The system will automatically calculate the improvement percentage.
              </div>
            )}
          </div>
        )}
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
  },
  hint: {
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#1e40af',
    marginBottom: '12px'
  },
  salaryHint: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '-8px',
    marginBottom: '12px'
  },
  useMinBtn: {
    padding: '6px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #10b981',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#059669',
    fontWeight: '500'
  },
  useMaxBtn: {
    padding: '6px 12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#d97706',
    fontWeight: '500'
  },
  useMidBtn: {
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#2563eb',
    fontWeight: '500'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  initialSalaryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  initialSalaryValue: {
    fontWeight: '600',
    color: '#6b7280'
  },
  improvementBadge: {
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #10b981',
    borderRadius: '4px',
    color: '#059669',
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '-8px',
    marginBottom: '12px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  toggleBtn: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#374151'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    marginBottom: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  hintText: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 'normal'
  },
  negotiationSummary: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '4px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '14px',
    borderBottom: '1px solid #e5e7eb'
  }
};

