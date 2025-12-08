import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LinkedInOAuthButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Save user info if provided
      if (user) {
        localStorage.setItem('linkedinUser', user);
      }

      // Redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLinkedInLogin = () => {
    setLoading(true);
    // Redirect to backend OAuth endpoint
    window.location.href = 'http://localhost:4000/api/auth/linkedin';
  };

  return (
    <button
      onClick={handleLinkedInLogin}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '12px 24px',
        backgroundColor: '#0A66C2',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.3s ease',
        width: '100%',
        marginTop: '16px',
      }}
      onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#094FB2')}
      onMouseLeave={(e) => (e.target.style.backgroundColor = '#0A66C2')}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
      </svg>
      {loading ? 'Connecting...' : 'Login with LinkedIn'}
    </button>
  );
};

export default LinkedInOAuthButton;
