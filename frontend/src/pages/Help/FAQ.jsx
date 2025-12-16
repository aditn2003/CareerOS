// src/pages/Help/FAQ.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./Help.css";

const faqData = [
  {
    category: "Account & Login",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' on the homepage. You can register with email/password or use Google Sign-In for quick signup."
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Click 'Forgot Password?' on the login page, enter your email, and check your inbox for a reset link. Don't forget to check your spam folder!"
      },
      {
        q: "Can I change my email address?",
        a: "Currently, email addresses cannot be changed after registration. If you need to use a different email, please create a new account."
      },
      {
        q: "How do I delete my account?",
        a: "Contact us at support@atscareeros.com with the subject 'Account Deletion Request' and we'll process your request within 7 business days."
      }
    ]
  },
  {
    category: "Job Tracking",
    questions: [
      {
        q: "How many jobs can I track?",
        a: "There's no limit! Track as many job applications as you need."
      },
      {
        q: "What do the job statuses mean?",
        a: "Wishlist = interested but not applied, Applied = submitted, Interview = got an interview, Offer = received an offer, Rejected = declined."
      },
      {
        q: "Can I import jobs from LinkedIn or Indeed?",
        a: "Currently, jobs must be added manually. Copy-paste the job URL and details from job boards."
      },
      {
        q: "How do I delete a job?",
        a: "Open the job details page and click the delete/trash icon, then confirm the deletion."
      }
    ]
  },
  {
    category: "Resume Features",
    questions: [
      {
        q: "What file formats are supported for resume uploads?",
        a: "PDF (recommended) and DOCX (Microsoft Word) are supported."
      },
      {
        q: "Is there a file size limit for resumes?",
        a: "Yes, the maximum file size is 5 MB per resume."
      },
      {
        q: "How does AI resume tailoring work?",
        a: "Our AI reads the job description, analyzes your resume, and suggests changes to better match keywords and requirements. You review and download the tailored version."
      },
      {
        q: "Will the AI change my personal information?",
        a: "No. The AI only suggests changes to skills, experience descriptions, and formatting. Your contact info and work history remain accurate."
      }
    ]
  },
  {
    category: "Cover Letters",
    questions: [
      {
        q: "How does the AI cover letter generator work?",
        a: "The AI reads the job posting and your profile to create a personalized cover letter mentioning relevant skills and experience."
      },
      {
        q: "Should I edit the AI-generated cover letter?",
        a: "Yes! Always add a personal touch. Mention specific projects, use your own voice, and ensure accuracy."
      }
    ]
  },
  {
    category: "Privacy & Security",
    questions: [
      {
        q: "Is my data secure?",
        a: "Yes. We use HTTPS encryption, bcrypt password hashing, JWT authentication, and rate limiting to protect your data."
      },
      {
        q: "Who can see my data?",
        a: "Only you can see your data. Your job applications, resumes, and personal information are private."
      },
      {
        q: "Do you sell my data?",
        a: "No. We do not sell or share your personal data with third parties for marketing purposes."
      },
      {
        q: "How long do you keep my data?",
        a: "We retain your data as long as your account is active. If you delete your account, your data is permanently removed within 30 days."
      }
    ]
  },
  {
    category: "Technical Issues",
    questions: [
      {
        q: "The site is loading slowly. What should I do?",
        a: "Try: 1) Check your internet connection, 2) Clear browser cache (Ctrl+Shift+R), 3) Try a different browser, 4) Disable browser extensions."
      },
      {
        q: "The site shows a blank page. How do I fix it?",
        a: "Hard refresh (Ctrl+Shift+R), clear browser cache and cookies, try incognito mode, or update your browser."
      },
      {
        q: "I can't log in with Google. What should I do?",
        a: "Make sure pop-ups are enabled, clear cookies for google.com, or try logging in with email/password."
      }
    ]
  },
  {
    category: "Billing & Pricing",
    questions: [
      {
        q: "Is CareerOS free?",
        a: "Yes! CareerOS is currently free for all users as part of our CS490 academic project."
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
      <button 
        className="faq-question"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {isOpen && (
        <div className="faq-answer">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="help-page">
      <div className="help-container">
        <nav className="help-breadcrumb">
          <Link to="/">Home</Link> / <Link to="/help">Help</Link> / FAQ
        </nav>

        <h1>Frequently Asked Questions</h1>
        <p className="help-intro">
          Find answers to common questions about CareerOS. Can't find what you're looking for? 
          Contact us at <a href="mailto:support@atscareeros.com">support@atscareeros.com</a>.
        </p>

        <div className="faq-container">
          {faqData.map((category, idx) => (
            <section key={idx} className="faq-category">
              <h2>{category.category}</h2>
              <div className="faq-list">
                {category.questions.map((item, qIdx) => (
                  <FAQItem key={qIdx} question={item.q} answer={item.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="help-section help-team">
          <h2>About the Team</h2>
          <p>CareerOS was built by the Aandsz Forces team for CS490:</p>
          <ul className="team-list">
            <li><strong>Digant</strong> — Team Lead, Database Admin</li>
            <li><strong>Adit</strong> — Backend Lead</li>
            <li><strong>Sujal</strong> — DevOps Lead</li>
            <li><strong>Aditya</strong> — Frontend Lead</li>
            <li><strong>Abhi</strong> — Full Stack Developer</li>
            <li><strong>Zaid</strong> — Full Stack Developer</li>
          </ul>
        </section>

        <p className="help-last-updated">Last Updated: December 2025</p>
      </div>
    </div>
  );
}

