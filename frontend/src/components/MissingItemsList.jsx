// frontend/src/components/MissingItemsList.jsx
// UC-122: Missing Keywords and Skills Component

import React from "react";
import "./MissingItemsList.css";

export default function MissingItemsList({ missingKeywords = [], missingSkills = [] }) {
  if (missingKeywords.length === 0 && missingSkills.length === 0) {
    return null;
  }

  return (
    <div className="missing-items-card">
      <h3 className="missing-items-title">Missing Items</h3>
      <p className="missing-items-subtitle">
        Keywords and skills from the job description that are not found in your application
      </p>

      <div className="missing-items-content">
        {missingKeywords.length > 0 && (
          <div className="missing-items-section">
            <h4 className="missing-items-section-title">
              <span className="missing-items-icon">🔑</span>
              Missing Keywords ({missingKeywords.length})
            </h4>
            <div className="missing-items-tags">
              {missingKeywords.map((keyword, index) => (
                <span key={index} className="missing-item-tag keyword">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {missingSkills.length > 0 && (
          <div className="missing-items-section">
            <h4 className="missing-items-section-title">
              <span className="missing-items-icon">💼</span>
              Missing Skills ({missingSkills.length})
            </h4>
            <div className="missing-items-tags">
              {missingSkills.map((skill, index) => (
                <span key={index} className="missing-item-tag skill">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



