// src/pages/Profile/InfoTab.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../contexts/ProfileContext";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import LinkedInProfileOptimization from "../../components/LinkedInProfileOptimization";
import LinkedInMessageTemplates from "../../components/LinkedInMessageTemplates";

export default function InfoTab() {
  const { profile, setProfile, loadProfile, saveProfile } = useProfile();
  const { token } = useAuth();
  const navigate = useNavigate();

  // ---------- Picture Upload States ----------
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // ---------- LinkedIn Profile Data ----------
  const [linkedInProfile, setLinkedInProfile] = useState(null);
  const [showLinkedInTools, setShowLinkedInTools] = useState(false);

  // ---------- Load Profile on Mount ----------
  useEffect(() => {
    loadProfile();
    
    const storedLinkedInProfile = localStorage.getItem("linkedinProfile");
    if (storedLinkedInProfile) {
      try {
        const linkedIn = JSON.parse(storedLinkedInProfile);
        setLinkedInProfile(linkedIn);
        
        setTimeout(() => {
          setProfile(prev => {
            if (!prev) return prev;
            const updates = {};
            if (!prev.full_name && linkedIn.first_name && linkedIn.last_name) {
              updates.full_name = `${linkedIn.first_name} ${linkedIn.last_name}`;
            }
            if (!prev.email && linkedIn.email) {
              updates.email = linkedIn.email;
            }
            if (!prev.picture_url && linkedIn.profile_pic_url) {
              updates.picture_url = linkedIn.profile_pic_url;
            }
            if (Object.keys(updates).length > 0) {
              return { ...prev, ...updates };
            }
            return prev;
          });
        }, 500);
      } catch (e) {
        console.error("Error parsing LinkedIn profile:", e);
      }
    }
  }, []);

  // ---------- Handle Preview ----------
  useEffect(() => {
    if (!selectedFile) {
      setPreview(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // ---------- Upload Profile Picture ----------
  async function uploadPicture() {
    if (!selectedFile) return alert("Please choose a file first!");
    if (selectedFile.size > 5 * 1024 * 1024)
      return alert("Max file size is 5MB.");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setUploading(true);
      const { data } = await api.post("/api/upload-profile-pic", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (p) =>
          setUploadProgress(Math.round((p.loaded / p.total) * 100)),
      });

      await api.post(
        "/api/profile/picture",
        { url: data.url },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadProfile();
      setSelectedFile(null);
      setPreview(null);
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ---------- Save Profile Info ----------
  async function handleSave() {
    try {
      await saveProfile();
      alert("Profile saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  }

  if (!profile) return <p>Loading profile...</p>;

  const styles = {
    container: {
      maxWidth: '720px',
      margin: '0 auto',
      padding: '20px'
    },
    linkedInBanner: {
      background: 'linear-gradient(135deg, #0077B5 0%, #00A0DC 100%)',
      borderRadius: '10px',
      padding: '12px 16px',
      marginBottom: '20px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px'
    },
    card: {
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      marginBottom: '20px'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      color: 'white'
    },
    avatar: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      border: '3px solid white',
      objectFit: 'cover'
    },
    form: {
      padding: '20px'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '14px',
      marginBottom: '14px'
    },
    field: {
      marginBottom: '14px'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#666',
      marginBottom: '5px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #e0e0e0',
      borderRadius: '6px',
      fontSize: '14px',
      resize: 'vertical',
      minHeight: '80px',
      boxSizing: 'border-box'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '10px 24px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    btnSecondary: {
      background: 'transparent',
      color: '#666',
      border: '1px solid #ddd',
      padding: '10px 24px',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer'
    },
    btnSmall: {
      padding: '6px 12px',
      borderRadius: '5px',
      fontSize: '12px',
      cursor: 'pointer',
      border: 'none'
    },
    toolsToggle: {
      background: '#fff',
      padding: '14px 18px',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      border: 'none',
      width: '100%',
      textAlign: 'left'
    }
  };

  return (
    <div style={styles.container}>
      {/* LinkedIn Connected Banner */}
      {linkedInProfile && (
        <div style={styles.linkedInBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {linkedInProfile.profile_pic_url && (
              <img 
                src={linkedInProfile.profile_pic_url} 
                alt="LinkedIn"
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white' }}
              />
            )}
            <span style={{ fontWeight: '600', fontSize: '13px' }}>
              ✓ LinkedIn Connected • {linkedInProfile.email}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                setProfile(prev => ({
                  ...prev,
                  full_name: `${linkedInProfile.first_name} ${linkedInProfile.last_name}`,
                  email: linkedInProfile.email,
                  picture_url: linkedInProfile.profile_pic_url
                }));
              }}
              style={{ ...styles.btnSmall, background: 'white', color: '#0077B5', fontWeight: '600' }}
            >
              Sync
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("linkedinProfile");
                setLinkedInProfile(null);
              }}
              style={{ ...styles.btnSmall, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Main Profile Card */}
      <div style={styles.card}>
        {/* Header with Photo */}
        <div style={styles.header}>
          <div style={{ position: 'relative' }}>
            <img
              src={preview || linkedInProfile?.profile_pic_url || profile.picture_url || "/uploads/default-avatar.png"}
              alt="Profile"
              style={styles.avatar}
            />
            <label style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              background: 'white',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <span style={{ fontSize: '12px' }}>📷</span>
            </label>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {profile.full_name || 'Your Name'}
            </h2>
            <p style={{ margin: '3px 0 0', opacity: 0.9, fontSize: '13px' }}>
              {profile.title || 'Add your headline'}
            </p>
            <p style={{ margin: '3px 0 0', opacity: 0.75, fontSize: '12px' }}>
              📍 {profile.location || 'Location'}
            </p>
          </div>
        </div>

        {/* Photo Upload Actions */}
        {selectedFile && (
          <div style={{
            padding: '10px 20px',
            background: '#f7f7f7',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Photo ready</span>
            <button
              onClick={uploadPicture}
              disabled={uploading}
              style={{ ...styles.btnSmall, background: '#667eea', color: 'white' }}
            >
              {uploading ? `${uploadProgress}%` : 'Upload'}
            </button>
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); }}
              style={{ ...styles.btnSmall, background: '#eee', color: '#666' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Form Fields */}
        <div style={styles.form}>
          <div style={styles.row}>
            <div>
              <label style={styles.label}>Full Name *</label>
              <input
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Email *</label>
              <input
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div>
              <label style={styles.label}>Phone *</label>
              <input
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Location *</label>
              <input
                value={profile.location || ""}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Headline</label>
            <input
              value={profile.title || ""}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              placeholder="e.g., Software Engineer at Google"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Bio</label>
            <textarea
              maxLength={500}
              value={profile.bio || ""}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              style={styles.textarea}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button onClick={handleSave} style={styles.btnPrimary}>
              Save Changes
            </button>
            <button onClick={loadProfile} style={styles.btnSecondary}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* LinkedIn Tools Toggle */}
      <button
        onClick={() => setShowLinkedInTools(!showLinkedInTools)}
        style={styles.toolsToggle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077B5">
          <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
        </svg>
        LinkedIn Tools
        <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>
          {showLinkedInTools ? '▼' : '▶'}
        </span>
      </button>

      {showLinkedInTools && (
        <div style={{ marginTop: '16px' }}>
          <LinkedInProfileOptimization userProfile={{
            headline: profile.title || "",
            about: profile.bio || "",
            skills: profile.skills || [],
            job_title: profile.title || "",
            company_name: profile.company || "",
            industry: profile.industry || "",
            first_name: profile.full_name?.split(' ')[0] || "User",
            seniority: "Mid-level"
          }} />
          <div style={{ marginTop: '20px' }}>
            <LinkedInMessageTemplates userProfile={{
              headline: profile.title || "",
              about: profile.bio || "",
              skills: profile.skills || [],
              job_title: profile.title || "",
              company_name: profile.company || "",
              industry: profile.industry || "",
              first_name: profile.full_name?.split(' ')[0] || "User",
              seniority: "Mid-level"
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
