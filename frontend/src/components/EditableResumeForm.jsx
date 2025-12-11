// Editable Resume Form Component for Version Creation/Editing
// This component provides editable fields for all resume sections

import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

export default function EditableResumeForm({ 
  sections: initialSections, 
  onChange 
}) {
  // Format date values for HTML date inputs (must be yyyy-MM-dd format)
  const formatDateForInput = (value) => {
    // Handle null, undefined, or empty string
    if (!value || value === "" || value === null || value === undefined) {
      return "";
    }
    
    // Convert to string if not already
    const strValue = String(value).trim();
    if (!strValue) return "";
    
    // If already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
      return strValue;
    }
    
    // Handle year-month format (yyyy-MM) - add day 01
    if (/^\d{4}-\d{2}$/.test(strValue)) {
      return `${strValue}-01`;
    }
    
    // Handle ISO datetime strings (2024-07-31T04:00:00.000Z or 2024-07-31T04:00:00.000Z)
    if (strValue.includes("T")) {
      const dateOnly = strValue.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return dateOnly;
      }
    }
    
    // Try to parse as Date object
    try {
      const d = new Date(strValue);
      if (!isNaN(d.getTime()) && d instanceof Date) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // If parsing fails, return empty string
    }
    
    // If all else fails, return empty string to avoid React warnings
    return "";
  };

  // Normalize dates in sections object
  const normalizeDatesInSections = (sectionsData) => {
    if (!sectionsData) return sectionsData;
    const normalized = { ...sectionsData };
    
    // Normalize experience dates
    if (normalized.experience && Array.isArray(normalized.experience)) {
      normalized.experience = normalized.experience.map(exp => ({
        ...exp,
        start_date: formatDateForInput(exp.start_date),
        end_date: formatDateForInput(exp.end_date)
      }));
    }
    
    // Normalize education dates
    if (normalized.education && Array.isArray(normalized.education)) {
      normalized.education = normalized.education.map(edu => ({
        ...edu,
        graduation_date: formatDateForInput(edu.graduation_date)
      }));
    }
    
    // Normalize certification dates
    if (normalized.certifications && Array.isArray(normalized.certifications)) {
      normalized.certifications = normalized.certifications.map(cert => ({
        ...cert,
        date_earned: formatDateForInput(cert.date_earned)
      }));
    }
    
    return normalized;
  };

  const [sections, setSections] = useState(() => {
    let parsedSections;
    if (!initialSections || typeof initialSections === 'string') {
      try {
        parsedSections = initialSections ? JSON.parse(initialSections) : {
          summary: { full_name: "", title: "", contact: { email: "", phone: "", location: "" }, bio: "" },
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: []
        };
      } catch {
        parsedSections = {
          summary: { full_name: "", title: "", contact: { email: "", phone: "", location: "" }, bio: "" },
          experience: [],
          education: [],
          skills: [],
          projects: [],
          certifications: []
        };
      }
    } else {
      parsedSections = {
        summary: initialSections.summary || { full_name: "", title: "", contact: { email: "", phone: "", location: "" }, bio: "" },
        experience: initialSections.experience || [],
        education: initialSections.education || [],
        skills: initialSections.skills || [],
        projects: initialSections.projects || [],
        certifications: initialSections.certifications || []
      };
    }
    
    // Normalize all dates in the initial sections
    return normalizeDatesInSections(parsedSections);
  });

  useEffect(() => {
    if (onChange) {
      onChange(sections);
    }
  }, [sections, onChange]);

  const updateSection = (sectionKey, value) => {
    setSections(prev => ({ ...prev, [sectionKey]: value }));
  };

  const updateSummary = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSections(prev => ({
        ...prev,
        summary: {
          ...prev.summary,
          [parent]: {
            ...prev.summary[parent],
            [child]: value
          }
        }
      }));
    } else {
      setSections(prev => ({
        ...prev,
        summary: { ...prev.summary, [field]: value }
      }));
    }
  };

  const addItem = (sectionKey, template = {}) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), template]
    }));
  };

  const removeItem = (sectionKey, index) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((_, i) => i !== index)
    }));
  };

  const updateItem = (sectionKey, index, field, value) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey].map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addSkill = (skill) => {
    if (skill.trim()) {
      setSections(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill.trim()]
      }));
    }
  };

  const removeSkill = (index) => {
    setSections(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="editable-resume-form">
      {/* Summary Section */}
      <div className="editable-section">
        <h4>Summary</h4>
        <div className="field-group">
          <label>Full Name</label>
          <input
            type="text"
            value={sections.summary?.full_name || ""}
            onChange={(e) => updateSummary('full_name', e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="field-group">
          <label>Professional Title</label>
          <input
            type="text"
            value={sections.summary?.title || ""}
            onChange={(e) => updateSummary('title', e.target.value)}
            placeholder="Software Engineer"
          />
        </div>
        <div className="field-group">
          <label>Email</label>
          <input
            type="email"
            value={sections.summary?.contact?.email || ""}
            onChange={(e) => updateSummary('contact.email', e.target.value)}
            placeholder="john@example.com"
          />
        </div>
        <div className="field-group">
          <label>Phone</label>
          <input
            type="text"
            value={sections.summary?.contact?.phone || ""}
            onChange={(e) => updateSummary('contact.phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="field-group">
          <label>Location</label>
          <input
            type="text"
            value={sections.summary?.contact?.location || ""}
            onChange={(e) => updateSummary('contact.location', e.target.value)}
            placeholder="City, State"
          />
        </div>
        <div className="field-group">
          <label>Bio/Summary</label>
          <textarea
            value={sections.summary?.bio || ""}
            onChange={(e) => updateSummary('bio', e.target.value)}
            placeholder="Professional summary or objective"
            rows={4}
          />
        </div>
      </div>

      {/* Experience Section */}
      <div className="editable-section">
        <div className="section-header">
          <h4>Experience</h4>
          <button type="button" className="btn-add" onClick={() => addItem('experience', { title: "", company: "", location: "", start_date: "", end_date: "", current: false, description: "" })}>
            <FaPlus /> Add Experience
          </button>
        </div>
        {sections.experience?.map((exp, idx) => (
          <div key={idx} className="entry-card">
            <div className="entry-header">
              <h5>Experience {idx + 1}</h5>
              <button type="button" className="btn-remove" onClick={() => removeItem('experience', idx)}>
                <FaTrash />
              </button>
            </div>
            <div className="field-group">
              <label>Job Title</label>
              <input
                type="text"
                value={exp.title || exp.role || ""}
                onChange={(e) => updateItem('experience', idx, 'title', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div className="field-group">
              <label>Company</label>
              <input
                type="text"
                value={exp.company || ""}
                onChange={(e) => updateItem('experience', idx, 'company', e.target.value)}
                placeholder="Company Name"
              />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Location</label>
                <input
                  type="text"
                  value={exp.location || ""}
                  onChange={(e) => updateItem('experience', idx, 'location', e.target.value)}
                  placeholder="City, State"
                />
              </div>
              <div className="field-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formatDateForInput(exp.start_date)}
                  onChange={(e) => updateItem('experience', idx, 'start_date', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={formatDateForInput(exp.end_date)}
                  onChange={(e) => updateItem('experience', idx, 'end_date', e.target.value)}
                  disabled={exp.current}
                />
              </div>
            </div>
            <div className="field-group">
              <label>
                <input
                  type="checkbox"
                  checked={exp.current || false}
                  onChange={(e) => updateItem('experience', idx, 'current', e.target.checked)}
                />
                Current Position
              </label>
            </div>
            <div className="field-group">
              <label>Description</label>
              <textarea
                value={typeof exp.description === 'string' ? exp.description : (Array.isArray(exp.description) ? exp.description.join('\n') : '')}
                onChange={(e) => updateItem('experience', idx, 'description', e.target.value)}
                placeholder="• Achievement 1&#10;• Achievement 2&#10;• Achievement 3"
                rows={5}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Education Section */}
      <div className="editable-section">
        <div className="section-header">
          <h4>Education</h4>
          <button type="button" className="btn-add" onClick={() => addItem('education', { institution: "", degree_type: "", field_of_study: "", graduation_date: "", gpa: "" })}>
            <FaPlus /> Add Education
          </button>
        </div>
        {sections.education?.map((edu, idx) => (
          <div key={idx} className="entry-card">
            <div className="entry-header">
              <h5>Education {idx + 1}</h5>
              <button type="button" className="btn-remove" onClick={() => removeItem('education', idx)}>
                <FaTrash />
              </button>
            </div>
            <div className="field-group">
              <label>Institution</label>
              <input
                type="text"
                value={edu.institution || ""}
                onChange={(e) => updateItem('education', idx, 'institution', e.target.value)}
                placeholder="University Name"
              />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Degree Type</label>
                <input
                  type="text"
                  value={edu.degree_type || edu.education_level || ""}
                  onChange={(e) => updateItem('education', idx, 'degree_type', e.target.value)}
                  placeholder="BS, MS, PhD"
                />
              </div>
              <div className="field-group">
                <label>Field of Study</label>
                <input
                  type="text"
                  value={edu.field_of_study || ""}
                  onChange={(e) => updateItem('education', idx, 'field_of_study', e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>Graduation Date</label>
                <input
                  type="date"
                  value={formatDateForInput(edu.graduation_date)}
                  onChange={(e) => updateItem('education', idx, 'graduation_date', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>GPA</label>
                <input
                  type="text"
                  value={edu.gpa || ""}
                  onChange={(e) => updateItem('education', idx, 'gpa', e.target.value)}
                  placeholder="3.8"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills Section */}
      <div className="editable-section">
        <h4>Skills</h4>
        <div className="skills-tags-container">
          <div className="skills-tags">
            {sections.skills?.map((skill, idx) => (
              <div key={idx} className="skill-tag">
                {typeof skill === 'string' ? skill : (skill.name || skill.skill || skill)}
                <button type="button" className="skill-remove" onClick={() => removeSkill(idx)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            className="skill-input"
            placeholder="Type a skill and press Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill(e.target.value);
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Projects Section */}
      <div className="editable-section">
        <div className="section-header">
          <h4>Projects</h4>
          <button type="button" className="btn-add" onClick={() => addItem('projects', { name: "", role: "", description: "", technologies: [] })}>
            <FaPlus /> Add Project
          </button>
        </div>
        {sections.projects?.map((proj, idx) => (
          <div key={idx} className="entry-card">
            <div className="entry-header">
              <h5>Project {idx + 1}</h5>
              <button type="button" className="btn-remove" onClick={() => removeItem('projects', idx)}>
                <FaTrash />
              </button>
            </div>
            <div className="field-group">
              <label>Project Name</label>
              <input
                type="text"
                value={proj.name || ""}
                onChange={(e) => updateItem('projects', idx, 'name', e.target.value)}
                placeholder="Project Name"
              />
            </div>
            <div className="field-group">
              <label>Role</label>
              <input
                type="text"
                value={proj.role || ""}
                onChange={(e) => updateItem('projects', idx, 'role', e.target.value)}
                placeholder="Lead Developer"
              />
            </div>
            <div className="field-group">
              <label>Description</label>
              <textarea
                value={typeof proj.description === 'string' ? proj.description : ''}
                onChange={(e) => updateItem('projects', idx, 'description', e.target.value)}
                placeholder="Project description"
                rows={4}
              />
            </div>
            <div className="field-group">
              <label>Technologies (comma-separated)</label>
              <input
                type="text"
                value={Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '')}
                onChange={(e) => updateItem('projects', idx, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                placeholder="React, Node.js, MongoDB"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Certifications Section */}
      <div className="editable-section">
        <div className="section-header">
          <h4>Certifications</h4>
          <button type="button" className="btn-add" onClick={() => addItem('certifications', { name: "", organization: "", date_earned: "" })}>
            <FaPlus /> Add Certification
          </button>
        </div>
        {sections.certifications?.map((cert, idx) => (
          <div key={idx} className="entry-card">
            <div className="entry-header">
              <h5>Certification {idx + 1}</h5>
              <button type="button" className="btn-remove" onClick={() => removeItem('certifications', idx)}>
                <FaTrash />
              </button>
            </div>
            <div className="field-group">
              <label>Certification Name</label>
              <input
                type="text"
                value={cert.name || ""}
                onChange={(e) => updateItem('certifications', idx, 'name', e.target.value)}
                placeholder="AWS Certified Solutions Architect"
              />
            </div>
            <div className="field-group">
              <label>Organization</label>
              <input
                type="text"
                value={cert.organization || ""}
                onChange={(e) => updateItem('certifications', idx, 'organization', e.target.value)}
                placeholder="Amazon Web Services"
              />
            </div>
            <div className="field-group">
              <label>Date Earned</label>
              <input
                type="date"
                value={formatDateForInput(cert.date_earned)}
                onChange={(e) => updateItem('certifications', idx, 'date_earned', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

