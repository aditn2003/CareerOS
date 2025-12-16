// src/components/LegalModal.jsx
import React from "react";
import { FaTimes } from "react-icons/fa";
import "./LegalModal.css";

export function TermsContent() {
  return (
    <>
      <h2>Terms of Service</h2>
      <p className="legal-date">Effective Date: December 15, 2025</p>

      <section>
        <h3>1. Introduction</h3>
        <p>
          Welcome to CareerOS, an applicant tracking system designed to help job seekers 
          manage their job search process. By accessing or using CareerOS, you agree to 
          be bound by these Terms of Service.
        </p>
      </section>

      <section>
        <h3>2. Eligibility</h3>
        <p>To use CareerOS, you must:</p>
        <ul>
          <li>Be at least 18 years old or have parental/guardian consent</li>
          <li>Provide accurate registration information</li>
          <li>Not be prohibited from using the Service under applicable laws</li>
        </ul>
      </section>

      <section>
        <h3>3. Account Responsibility</h3>
        <p>You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your login credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized access</li>
        </ul>
      </section>

      <section>
        <h3>4. Acceptable Use</h3>
        <p>You agree NOT to:</p>
        <ul>
          <li>Use the Service for illegal purposes</li>
          <li>Upload malicious code or viruses</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Impersonate another person or entity</li>
          <li>Share your account credentials with others</li>
        </ul>
      </section>

      <section>
        <h3>5. User Content</h3>
        <p>
          You retain ownership of all content you upload to CareerOS (resumes, cover letters, 
          job data). By uploading, you grant us a limited license to store and process your 
          content to provide the Service.
        </p>
      </section>

      <section>
        <h3>6. AI-Generated Content</h3>
        <p>
          AI-generated content may not always be accurate and should be reviewed before use. 
          It does not constitute professional career advice.
        </p>
      </section>

      <section>
        <h3>7. Disclaimers</h3>
        <p>
          CareerOS is provided "AS IS" without warranties. We do not guarantee that using 
          CareerOS will result in job offers or employment success.
        </p>
      </section>

      <section>
        <h3>8. Limitation of Liability</h3>
        <p>
          We shall not be liable for any indirect, incidental, special, or consequential damages, 
          including loss of profits, data, or employment opportunities.
        </p>
      </section>

      <section>
        <h3>9. Academic Project Notice</h3>
        <p>
          CareerOS is developed as part of the CS490 course. The Service may be discontinued 
          after the course ends and is provided free of charge.
        </p>
      </section>

      <section>
        <h3>10. Contact</h3>
        <p>
          For questions, contact us at: <strong>support@atscareeros.com</strong>
        </p>
      </section>

      <p className="legal-updated">Last Updated: December 15, 2025</p>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <h2>Privacy Policy</h2>
      <p className="legal-date">Effective Date: December 15, 2025</p>

      <section>
        <h3>1. Information We Collect</h3>
        <p><strong>Information You Provide:</strong></p>
        <ul>
          <li>Account info: Name, email, password</li>
          <li>Profile: Phone, location, LinkedIn URL</li>
          <li>Resume data: Work history, education, skills</li>
          <li>Job applications: Companies, positions, status</li>
        </ul>
        <p><strong>Automatically Collected:</strong></p>
        <ul>
          <li>Usage data, device info, log data</li>
        </ul>
      </section>

      <section>
        <h3>2. How We Use Your Information</h3>
        <ul>
          <li>Provide and maintain the CareerOS service</li>
          <li>Process job applications and track progress</li>
          <li>Generate AI-powered suggestions</li>
          <li>Send important notifications</li>
          <li>Improve our service</li>
        </ul>
      </section>

      <section>
        <h3>3. Data Sharing</h3>
        <p><strong>We do NOT sell your personal data.</strong></p>
        <p>We may share data with:</p>
        <ul>
          <li>Service providers (hosting, database, email)</li>
          <li>AI services for generating suggestions</li>
          <li>Legal requirements when required by law</li>
        </ul>
      </section>

      <section>
        <h3>4. Data Security</h3>
        <ul>
          <li>HTTPS/TLS encryption for all data</li>
          <li>Passwords hashed using bcrypt</li>
          <li>JWT tokens with expiration</li>
          <li>Rate limiting protection</li>
        </ul>
      </section>

      <section>
        <h3>5. Data Retention</h3>
        <p>
          We retain your data as long as your account is active. Upon account deletion, 
          data is permanently removed within 30 days.
        </p>
      </section>

      <section>
        <h3>6. Your Rights</h3>
        <ul>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Correction:</strong> Update inaccurate data</li>
          <li><strong>Deletion:</strong> Request account deletion</li>
        </ul>
        <p>Contact support@atscareeros.com to exercise these rights.</p>
      </section>

      <section>
        <h3>7. Children's Privacy</h3>
        <p>
          CareerOS is not intended for users under 18. We do not knowingly collect 
          information from children.
        </p>
      </section>

      <section>
        <h3>8. Contact</h3>
        <p>
          For questions, contact: <strong>support@atscareeros.com</strong>
        </p>
      </section>

      <p className="legal-updated">Last Updated: December 15, 2025</p>
    </>
  );
}

export default function LegalModal({ isOpen, onClose, type }) {
  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <button className="legal-modal-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
        <div className="legal-modal-content">
          {type === "terms" && <TermsContent />}
          {type === "privacy" && <PrivacyContent />}
        </div>
      </div>
    </div>
  );
}

