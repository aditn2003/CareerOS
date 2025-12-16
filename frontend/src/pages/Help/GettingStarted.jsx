// src/pages/Help/GettingStarted.jsx
import React from "react";
import { Link } from "react-router-dom";
import { 
  FaUserPlus, 
  FaUser, 
  FaFileAlt, 
  FaBriefcase, 
  FaMagic, 
  FaEnvelope,
  FaComments,
  FaChartBar,
  FaUsers,
  FaRocket,
  FaCheckCircle
} from "react-icons/fa";
import "./Help.css";

export default function GettingStarted() {
  return (
    <div className="help-page">
      <div className="help-container">
        <nav className="help-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/help">Help</Link> / Getting Started
        </nav>

        <h1>Getting Started with CareerOS</h1>
        <p className="help-intro">
          Welcome to <strong>CareerOS</strong> — your personal job search companion! 
          This guide will help you get up and running in just 5 minutes. 🚀
        </p>

        {/* Quick Start Section */}
        <section className="getting-started-steps">
          <h2><FaRocket /> Quick Start (5 Minutes)</h2>

          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3><FaUserPlus /> Create Your Account</h3>
              <ol>
                <li>Go to the CareerOS website</li>
                <li>Click <strong>"Sign Up"</strong> or <strong>"Get Started"</strong></li>
                <li>Choose <strong>Email/Password</strong> or <strong>Google Sign-In</strong></li>
                <li>Verify your email (check spam folder if needed)</li>
                <li>You're in! 🎉</li>
              </ol>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3><FaUser /> Complete Your Profile</h3>
              <ol>
                <li>Navigate to <strong>Profile</strong> from the sidebar</li>
                <li>Fill in your basic information (name, phone, location)</li>
                <li>Add your LinkedIn URL (optional but recommended)</li>
                <li>Click <strong>Save</strong></li>
              </ol>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3><FaFileAlt /> Upload Your Resume</h3>
              <ol>
                <li>Go to <strong>Resume</strong> in the sidebar</li>
                <li>Click <strong>"Upload Resume"</strong></li>
                <li>Select your PDF or DOCX file</li>
                <li>Your resume is now stored and ready for AI tailoring!</li>
              </ol>
            </div>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3><FaBriefcase /> Add Your First Job</h3>
              <ol>
                <li>Click <strong>"+ Add Job"</strong> from the Dashboard</li>
                <li>Fill in: Company Name, Position, Job URL</li>
                <li>Set status to "Wishlist" or "Applied"</li>
                <li>Click <strong>Save</strong></li>
              </ol>
              <p className="step-success"><FaCheckCircle /> Congratulations! You've set up your CareerOS account!</p>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="help-section">
          <h2>Core Features</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <FaBriefcase className="feature-icon" />
              <h3>Job Tracking</h3>
              <p>Keep all your job applications organized in one place.</p>
              <ul>
                <li><strong>Wishlist</strong> — Jobs you're interested in</li>
                <li><strong>Applied</strong> — Applications submitted</li>
                <li><strong>Interview</strong> — Got an interview!</li>
                <li><strong>Offer</strong> — Received an offer</li>
                <li><strong>Rejected</strong> — Application declined</li>
              </ul>
            </div>

            <div className="feature-card">
              <FaMagic className="feature-icon" />
              <h3>AI Resume Tailoring</h3>
              <p>Let AI customize your resume for each job posting.</p>
              <ol>
                <li>Go to a job's detail page</li>
                <li>Click <strong>"Tailor Resume"</strong></li>
                <li>AI analyzes the job description</li>
                <li>Review and download your tailored resume</li>
              </ol>
            </div>

            <div className="feature-card">
              <FaEnvelope className="feature-icon" />
              <h3>AI Cover Letters</h3>
              <p>Create personalized cover letters in seconds.</p>
              <ol>
                <li>Go to a job's detail page</li>
                <li>Click <strong>"Generate Cover Letter"</strong></li>
                <li>Edit and personalize as needed</li>
                <li>Copy or download</li>
              </ol>
            </div>

            <div className="feature-card">
              <FaComments className="feature-icon" />
              <h3>Interview Preparation</h3>
              <p>Practice with AI-powered mock interviews.</p>
              <ul>
                <li><strong>Behavioral</strong> — STAR method questions</li>
                <li><strong>Technical</strong> — Role-specific questions</li>
                <li>Get AI feedback on your responses</li>
              </ul>
            </div>

            <div className="feature-card">
              <FaChartBar className="feature-icon" />
              <h3>Analytics Dashboard</h3>
              <p>Track your job search progress with visual insights.</p>
              <ul>
                <li>Applications by status</li>
                <li>Response rate</li>
                <li>Applications over time</li>
                <li>Top companies applied to</li>
              </ul>
            </div>

            <div className="feature-card">
              <FaUsers className="feature-icon" />
              <h3>Networking Contacts</h3>
              <p>Manage professional connections related to your job search.</p>
              <ul>
                <li>Track contacts by company</li>
                <li>Add notes and follow-ups</li>
                <li>Never lose a connection</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tips for Success */}
        <section className="help-section">
          <h2>Tips for Success</h2>
          <div className="tips-list">
            <div className="tip-item">
              <span className="tip-number">1</span>
              <div>
                <strong>Be Consistent</strong>
                <p>Update your job tracker daily — even 5 minutes keeps you organized.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">2</span>
              <div>
                <strong>Use AI Wisely</strong>
                <p>Let AI help, but always add your personal touch to resumes and cover letters.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">3</span>
              <div>
                <strong>Track Everything</strong>
                <p>Even rejections help you learn and improve your approach.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">4</span>
              <div>
                <strong>Network</strong>
                <p>Add contacts from every interaction — you never know who can help.</p>
              </div>
            </div>
            <div className="tip-item">
              <span className="tip-number">5</span>
              <div>
                <strong>Prepare</strong>
                <p>Use the interview prep feature before every interview!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Need Help */}
        <section className="help-section help-cta">
          <h2>Need More Help?</h2>
          <div className="help-links">
            <Link to="/faq" className="help-link-card">
              <h3>FAQ</h3>
              <p>Find answers to common questions</p>
            </Link>
            <a href="mailto:support@atscareeros.com" className="help-link-card">
              <h3>Email Support</h3>
              <p>support@atscareeros.com</p>
            </a>
          </div>
        </section>

        <p className="help-last-updated">
          Welcome to CareerOS — Good luck with your job search! 🍀
        </p>
      </div>
    </div>
  );
}

