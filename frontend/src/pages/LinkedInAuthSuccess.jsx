import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LinkedInAuthSuccess = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');

    if (token) {
      try {
        // Save token
        setToken(token);
        localStorage.setItem('token', token);

        // Parse and save user info
        if (user) {
          const userData = JSON.parse(decodeURIComponent(user));
          localStorage.setItem('linkedinUser', JSON.stringify(userData));
          
          // Extract userId from token
          const payload = JSON.parse(atob(token.split('.')[1]));
          localStorage.setItem('userId', payload.id);
        }

        // Redirect to dashboard
        setTimeout(() => navigate('/profile/info'), 500);
      } catch (error) {
        console.error('Error processing LinkedIn auth:', error);
        navigate('/login?error=auth_failed');
      }
    } else {
      navigate('/login?error=no_token');
    }
  }, [navigate, setToken]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      <div>
        <p>🔗 Connecting your LinkedIn account...</p>
        <p style={{ fontSize: '14px', marginTop: '10px' }}>Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
};

export default LinkedInAuthSuccess;
