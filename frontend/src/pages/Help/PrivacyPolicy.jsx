// src/pages/Help/PrivacyPolicy.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Help.css";

export default function PrivacyPolicy() {
  return (
    <div className="help-page">
      <div className="help-container">
        <nav className="help-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/help">Help</Link> / Privacy Policy
        </nav>

        <h1>Privacy Policy</h1>
        <p className="help-effective-date">Effective Date: December 15, 2025</p>

        <section className="help-section">
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy explains how CareerOS ("we," "us," "our") collects, uses, 
            and protects your personal information when you use our applicant tracking system.
          </p>
          <p>
            By using CareerOS, you consent to the data practices described in this policy.
          </p>
        </section>

        <section className="help-section">
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, password</li>
            <li><strong>Profile Information:</strong> Phone number, location, LinkedIn URL</li>
            <li><strong>Resume Data:</strong> Work history, education, skills, certifications</li>
            <li><strong>Job Application Data:</strong> Companies, positions, application status, notes</li>
            <li><strong>Networking Contacts:</strong> Professional connections you add</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
            <li><strong>Device Information:</strong> Browser type, operating system</li>
            <li><strong>Log Data:</strong> IP address, access times, error logs</li>
          </ul>

          <h3>2.3 Third-Party Authentication</h3>
          <p>If you sign in with Google or LinkedIn, we receive basic profile information from those services.</p>
        </section>

        <section className="help-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the CareerOS service</li>
            <li>Process your job applications and track your progress</li>
            <li>Generate AI-powered resume suggestions and cover letters</li>
            <li>Send password reset emails and important notifications</li>
            <li>Improve our service and develop new features</li>
            <li>Detect and prevent fraud or abuse</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>4. Data Sharing</h2>
          <p><strong>We do NOT sell your personal data.</strong></p>
          <p>We may share your information with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Hosting (Render, Vercel), Database (Supabase), Email (Resend)</li>
            <li><strong>AI Services:</strong> Google Gemini and OpenAI for generating suggestions (anonymized where possible)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>5. Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul>
            <li><strong>Encryption:</strong> HTTPS/TLS for all data in transit</li>
            <li><strong>Password Security:</strong> Passwords are hashed using bcrypt</li>
            <li><strong>Authentication:</strong> JWT tokens with expiration</li>
            <li><strong>Rate Limiting:</strong> Protection against brute force attacks</li>
            <li><strong>Security Headers:</strong> Helmet.js for HTTP security headers</li>
          </ul>
          <p>
            While we strive to protect your data, no method of transmission over the Internet 
            is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section className="help-section">
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide services.
          </p>
          <p>
            If you delete your account, your data will be permanently removed within 30 days, 
            except where we are required to retain it by law.
          </p>
        </section>

        <section className="help-section">
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Export:</strong> Download your data in a portable format</li>
          </ul>
          <p>To exercise these rights, contact us at support@atscareeros.com.</p>
        </section>

        <section className="help-section">
          <h2>8. Cookies and Tracking</h2>
          <p>
            CareerOS uses local storage (not cookies) to store your authentication token. 
            We do not use third-party tracking cookies or advertising cookies.
          </p>
        </section>

        <section className="help-section">
          <h2>9. Children's Privacy</h2>
          <p>
            CareerOS is not intended for users under 18 years of age. We do not knowingly 
            collect personal information from children under 18.
          </p>
        </section>

        <section className="help-section">
          <h2>10. International Data Transfers</h2>
          <p>
            Your data is stored on servers located in the United States. By using CareerOS, 
            you consent to the transfer of your data to the United States.
          </p>
        </section>

        <section className="help-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any 
            changes by posting the new policy on this page and updating the "Effective Date."
          </p>
        </section>

        <section className="help-section">
          <h2>12. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us:</p>
          <p>
            <strong>Aandsz Forces Team</strong><br />
            Email: support@atscareeros.com
          </p>
        </section>

        <section className="help-section help-notice">
          <h2>Academic Project Notice</h2>
          <p>
            CareerOS is developed as part of the CS490 academic course by the Aandsz Forces team. 
            Data handling practices are designed to meet educational requirements while 
            maintaining reasonable security standards.
          </p>
        </section>

        <p className="help-last-updated">Last Updated: December 15, 2025</p>
      </div>
    </div>
  );
}

