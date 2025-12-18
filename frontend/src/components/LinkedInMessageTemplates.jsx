import React, { useState } from 'react';
import axios from 'axios';
import './LinkedInMessageTemplates.css';
import { Copy, Download, Plus, Zap, MessageSquare } from 'lucide-react';
import { baseURL } from '../api';

const LinkedInMessageTemplates = ({ userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [displayedTemplates, setDisplayedTemplates] = useState(null);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedTemplates, setExpandedTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('connection_request');
  const API_BASE = `${baseURL}/api`;

  // Function to randomly pick one variation per template name
  const selectRandomVariations = (categories) => {
    if (!categories || !Array.isArray(categories)) {
      console.error('Invalid categories format, expected array:', categories);
      return categories || [];
    }
    
    return categories.map(category => {
      if (!category || !Array.isArray(category.templates)) {
        console.warn('Invalid category structure:', category);
        return category;
      }
      
      // Group templates by name, keeping all variations
      const templatesByName = {};
      category.templates.forEach(template => {
        if (!template || !template.name) {
          console.warn('Invalid template structure:', template);
          return;
        }
        const key = template.name;
        if (!templatesByName[key]) {
          templatesByName[key] = [];
        }
        templatesByName[key].push(template);
      });
      
      // Select one random template from each group
      const selectedTemplates = Object.values(templatesByName).map(templateGroup => {
        if (!templateGroup || templateGroup.length === 0) return null;
        return templateGroup[Math.floor(Math.random() * templateGroup.length)];
      }).filter(t => t !== null);
      
      return {
        ...category,
        templates: selectedTemplates,
      };
    });
  };

  const generateTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${API_BASE}/linkedin/generate-templates`,
        {
          target_context: 'networking',
          target_industry: userProfile?.industry || 'Technology',
          target_seniority: userProfile?.seniority || 'Mid-level',
          relationship_type: 'professional',
          your_name: userProfile?.first_name || 'Your Name',
          your_title: userProfile?.job_title || 'Professional',
          your_company: userProfile?.company_name || 'Your Company',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Raw response:', response.data);
      
      if (!response.data) {
        throw new Error('No response data from server');
      }
      
      const categories = response.data?.categories;
      if (!categories || !Array.isArray(categories)) {
        throw new Error(`Invalid categories format: ${typeof categories}`);
      }

      console.log('Categories array:', categories);
      console.log('Category count:', categories.length);
      
      // Apply random selection to display one variation per template name
      const selectedTemplates = selectRandomVariations(categories);
      console.log('Selected templates:', selectedTemplates);
      
      setTemplates(response.data);
      setDisplayedTemplates({ categories: selectedTemplates });
    } catch (err) {
      console.error('Error generating templates:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate templates');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadTemplate = (template, category) => {
    const element = document.createElement('a');
    const file = new Blob([template.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `linkedin-${category}-${template.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleTemplate = (templateId) => {
    if (expandedTemplates.includes(templateId)) {
      setExpandedTemplates(expandedTemplates.filter(id => id !== templateId));
    } else {
      setExpandedTemplates([...expandedTemplates, templateId]);
    }
  };

  if (!templates && !loading && !error) {
    return (
      <div className="templates-container">
        <div className="templates-header">
          <div className="header-content">
            <MessageSquare className="header-icon" />
            <div>
              <h2>LinkedIn Message Templates</h2>
              <p>Pre-written, customizable templates for every networking scenario</p>
            </div>
          </div>
          <button 
            className="btn-primary generate-btn"
            onClick={generateTemplates}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Templates'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}

        <div className="empty-state">
          <Zap className="empty-icon" />
          <h3>Create AI-Powered Message Templates</h3>
          <p>Get personalized templates for connection requests, follow-ups, thank you messages, and more</p>
        </div>
      </div>
    );
  }

  const currentCategory = (displayedTemplates?.categories || templates?.categories || []).find(c => c?.category === selectedCategory);

  return (
    <div className="templates-container">
      <div className="templates-header">
        <div className="header-content">
          <MessageSquare className="header-icon" />
          <div>
            <h2>LinkedIn Message Templates</h2>
            <p>Personalized templates for networking success</p>
          </div>
        </div>
        <button 
          className="btn-secondary refresh-btn"
          onClick={generateTemplates}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating personalized templates...</p>
        </div>
      )}

      {templates && (
        <>
          {/* CATEGORY TABS */}
          <div className="category-tabs">
            {(displayedTemplates?.categories || templates?.categories || []).map((category) => (
              <button
                key={category.category}
                className={`category-tab ${selectedCategory === category.category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.category)}
              >
                <span>{category.label}</span>
                <span className="template-count">{category.templates?.length || 0}</span>
              </button>
            ))}
          </div>

          {/* CATEGORY INFO - Always show when templates exist */}
          {currentCategory && (
            <div className="category-info">
              <p className="best-practice">
                <strong>Best Practice:</strong> {currentCategory.best_practice}
              </p>
            </div>
          )}

          {/* DEBUG: Show if currentCategory is undefined */}
          {!currentCategory && templates && (
            <div className="error-message" style={{ marginTop: '20px' }}>
              <p>Category "{selectedCategory}" not found. Available categories: {(displayedTemplates?.categories || templates?.categories || []).map(c => c.category).join(', ')}</p>
            </div>
          )}

          {/* TEMPLATES LIST - Always show when templates exist */}
          {currentCategory && (
            <div className="templates-grid">
              {currentCategory.templates.map((template, index) => {
                const templateId = `${selectedCategory}-${index}`;
                const isExpanded = expandedTemplates.includes(templateId);
                return (
                  <div 
                    key={index}
                    className={`template-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div 
                      className="template-header"
                      onClick={() => toggleTemplate(templateId)}
                    >
                      <div className="header-left">
                        <h4>{template.name}</h4>
                        {template.effectiveness_note && (
                          <p className="effectiveness">{template.effectiveness_note}</p>
                        )}
                      </div>
                      <span className="expand-icon">
                        {isExpanded ? '−' : '+'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="template-content">
                        <div className="template-text">
                          <p>{template.content}</p>
                        </div>

                        {template.variables && template.variables.length > 0 && (
                          <div className="variables-section">
                            <h5>Customizable Variables:</h5>
                            <div className="variables-list">
                              {template.variables.map((variable, idx) => (
                                <span key={idx} className="variable-tag">
                                  {variable}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="template-actions">
                          <button
                            className={`action-btn copy-btn ${copiedId === templateId ? 'copied' : ''}`}
                            onClick={() => copyToClipboard(template.content, templateId)}
                          >
                            <Copy size={16} />
                            <span>{copiedId === templateId ? 'Copied!' : 'Copy'}</span>
                          </button>
                          <button
                            className="action-btn download-btn"
                            onClick={() => downloadTemplate(template, selectedCategory)}
                          >
                            <Download size={16} />
                            <span>Download</span>
                          </button>
                        </div>

                        <div className="template-tips">
                          <h5>Tips for Best Results:</h5>
                          <ul>
                            <li>Replace variables with specific information about the recipient</li>
                            <li>Keep the tone professional but personable</li>
                            <li>Proofread before sending</li>
                            <li>Send messages during business hours for better engagement</li>
                            <li>Wait 1-2 weeks between follow-ups</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* QUICK TIPS SECTION */}
          <div className="quick-tips">
            <h3>LinkedIn Messaging Tips</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <div className="tip-number">1</div>
                <h5>Personalize First</h5>
                <p>Always mention something specific about the person or their work</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">2</div>
                <h5>Show Value First</h5>
                <p>Lead with what you can offer, not what you want</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">3</div>
                <h5>Keep It Concise</h5>
                <p>2-3 short paragraphs are ideal for response rates</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">4</div>
                <h5>Clear Call-to-Action</h5>
                <p>Tell them exactly what you want (connect, chat, help, etc.)</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">5</div>
                <h5>Timing Matters</h5>
                <p>Send Tuesday-Thursday, 10am-3pm for best engagement</p>
              </div>
              <div className="tip-card">
                <div className="tip-number">6</div>
                <h5>Follow Up Smart</h5>
                <p>Wait 1-2 weeks before following up. Stop after 3 attempts</p>
              </div>
            </div>
          </div>

          {/* CONVERSION STRATEGY */}
          <div className="strategy-section">
            <h3>Message-to-Meeting Strategy</h3>
            <div className="strategy-flow">
              <div className="flow-step">
                <div className="step-number">DAY 1-2</div>
                <h5>Connection Request</h5>
                <p>Personalized request with specific mention</p>
                <div className="success-rate">65-70% acceptance</div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="step-number">DAY 3-5</div>
                <h5>First Message</h5>
                <p>Provide value or ask meaningful question</p>
                <div className="success-rate">35-45% response</div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="step-number">WEEK 2</div>
                <h5>Value Follow-Up</h5>
                <p>Share article, resource, or opportunity</p>
                <div className="success-rate">25-30% response</div>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <div className="step-number">WEEK 3-4</div>
                <h5>Collaboration Ask</h5>
                <p>Suggest specific collaboration or meeting</p>
                <div className="success-rate">15-20% conversion</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LinkedInMessageTemplates;
