// src/pages/Help/TermsOfService.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Help.css";

export default function TermsOfService() {
  return (
    <div className="help-page">
      <div className="help-container">
        <nav className="help-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/help">Help</Link> / Terms of Service
        </nav>

        <h1>Terms of Service</h1>
        <p className="help-effective-date">Effective Date: December 15, 2025</p>

        <section className="help-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to CareerOS ("Service"), an applicant tracking system designed to help job seekers 
            manage their job search process. This Service is provided by the Aandsz Forces team 
            ("we," "us," "our") as part of the CS490 academic project.
          </p>
          <p>
            By accessing or using CareerOS, you agree to be bound by these Terms of Service ("Terms"). 
            If you do not agree to these Terms, please do not use the Service.
          </p>
        </section>

        <section className="help-section">
          <h2>2. Eligibility</h2>
          <p>To use CareerOS, you must:</p>
          <ul>
            <li>Be at least 18 years old or have parental/guardian consent</li>
            <li>Provide accurate registration information</li>
            <li>Not be prohibited from using the Service under applicable laws</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>3. Account Registration</h2>
          <h3>3.1 Account Creation</h3>
          <p>You may create an account using:</p>
          <ul>
            <li>Email address and password</li>
            <li>Google OAuth sign-in</li>
          </ul>

          <h3>3.2 Account Responsibility</h3>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>

          <h3>3.3 Account Termination</h3>
          <p>We reserve the right to suspend or terminate accounts that:</p>
          <ul>
            <li>Violate these Terms</li>
            <li>Engage in fraudulent activity</li>
            <li>Remain inactive for extended periods</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>4. Acceptable Use</h2>
          <h3>4.1 Permitted Use</h3>
          <p>You may use CareerOS to:</p>
          <ul>
            <li>Track job applications</li>
            <li>Store and manage resumes</li>
            <li>Generate AI-assisted cover letters</li>
            <li>Prepare for interviews</li>
            <li>Manage networking contacts</li>
          </ul>

          <h3>4.2 Prohibited Use</h3>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use the Service for illegal purposes</li>
            <li>Upload malicious code or viruses</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Scrape, crawl, or harvest data from the Service</li>
            <li>Impersonate another person or entity</li>
            <li>Share your account credentials with others</li>
            <li>Use automated tools to access the Service without permission</li>
            <li>Interfere with or disrupt the Service</li>
          </ul>
        </section>

        <section className="help-section">
          <h2>5. User Content</h2>
          <h3>5.1 Ownership</h3>
          <p>You retain ownership of all content you upload to CareerOS, including resumes, cover letters, and job application data.</p>

          <h3>5.2 License Grant</h3>
          <p>By uploading content, you grant us a limited license to store and process your content to provide the Service.</p>

          <h3>5.3 Content Responsibility</h3>
          <p>You are solely responsible for the accuracy of information you provide and ensuring you have the right to upload content.</p>
        </section>

        <section className="help-section">
          <h2>6. AI-Generated Content</h2>
          <p>CareerOS uses artificial intelligence to generate resume suggestions, cover letters, and interview questions.</p>
          <p><strong>Limitations:</strong> AI-generated content may not always be accurate or appropriate, should be reviewed and edited before use, and does not constitute professional career advice.</p>
          <p>You are responsible for reviewing all AI-generated content before use.</p>
        </section>

        <section className="help-section">
          <h2>7. Privacy</h2>
          <p>
            Your use of CareerOS is also governed by our <Link to="/privacy">Privacy Policy</Link>. 
            We do not sell your personal data. See our Privacy Policy for complete details.
          </p>
        </section>

        <section className="help-section">
          <h2>8. Disclaimers</h2>
          <p>
            CareerOS is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. 
            We do not guarantee that using CareerOS will result in job offers or employment success.
          </p>
        </section>

        <section className="help-section">
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages, including loss of profits, data, or employment opportunities.
          </p>
        </section>

        <section className="help-section">
          <h2>10. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Changes become effective when posted to the Service. 
            Your continued use of the Service after changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="help-section">
          <h2>11. Contact Information</h2>
          <p>For questions about these Terms of Service, contact us at:</p>
          <p><strong>Aandsz Forces Team</strong><br />Email: support@atscareeros.com</p>
        </section>

        <section className="help-section help-notice">
          <h2>Academic Project Notice</h2>
          <p>
            CareerOS is developed as part of the CS490 course. As an academic project, 
            the Service may be discontinued after the course ends, features may change without notice, 
            and support may be limited.
          </p>
        </section>

        <p className="help-last-updated">Last Updated: December 15, 2025</p>
      </div>
    </div>
  );
}

