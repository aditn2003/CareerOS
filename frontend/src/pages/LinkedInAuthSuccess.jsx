import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LinkedInAuthSuccess = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting your LinkedIn account...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');
    const error = params.get('error');

    // Handle errors
    if (error) {
      setStatus('error');
      setMessage(`LinkedIn login failed: ${error}`);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // This page handles the passport-based OAuth flow (redirect-based)
    // For popup-based flow, this page might be reached directly without params
    if (token) {
      try {
        // Save token
        setToken(token);
        localStorage.setItem('token', token);

        // Parse and save user info
        if (user) {
          const userData = JSON.parse(decodeURIComponent(user));
          localStorage.setItem('linkedinUser', JSON.stringify(userData));
          localStorage.setItem('linkedinProfile', JSON.stringify(userData));
          
          // Extract userId from token
          const payload = JSON.parse(atob(token.split('.')[1]));
          localStorage.setItem('userId', payload.id);
        }

        setStatus('success');
        setMessage('✅ LinkedIn connected successfully! Redirecting...');
        
        // Redirect to profile
        setTimeout(() => navigate('/profile/info'), 1000);
      } catch (error) {
        console.error('Error processing LinkedIn auth:', error);
        setStatus('error');
        setMessage('Error processing authentication. Redirecting to login...');
        setTimeout(() => navigate('/login?error=auth_failed'), 2000);
      }
    } else {
      // No token - might be popup-based flow or direct navigation
      // Check if we're in a popup (this page shouldn't be used for popup flow)
      if (window.opener) {
        // We're in a popup - close it and let the opener handle things
        setMessage('Completing authentication...');
        setTimeout(() => window.close(), 500);
      } else {
        // Direct navigation without token - redirect to login
        setStatus('error');
        setMessage('No authentication data received. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    }
  }, [navigate, setToken]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: status === 'error' ? '#e53e3e' : '#666',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          margin: '0 auto 20px',
          background: status === 'error' ? '#fed7d7' : status === 'success' ? '#c6f6d5' : '#e2e8f0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px'
        }}>
          {status === 'error' ? '❌' : status === 'success' ? '✓' : '🔗'}
        </div>
        <p style={{ margin: 0 }}>{message}</p>
        {status === 'processing' && (
          <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
            Please wait...
          </p>
        )}
      </div>
    </div>
  );
};

export default LinkedInAuthSuccess;
