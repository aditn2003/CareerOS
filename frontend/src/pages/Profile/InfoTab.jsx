// src/pages/Profile/InfoTab.jsx
import React, { useEffect, useState } from "react";
import { useProfile } from "../../contexts/ProfileContext";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../api";
import LinkedInProfileOptimization from "../../components/LinkedInProfileOptimization";
import LinkedInMessageTemplates from "../../components/LinkedInMessageTemplates";

export default function InfoTab() {
  const { profile, setProfile, loadProfile, saveProfile } = useProfile();
  const { token } = useAuth();

  // ---------- Picture Upload States ----------
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ---------- Load Profile on Mount ----------
  useEffect(() => {
    loadProfile();
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
      return alert("❌ Max file size is 5MB.");

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

      // save image path to profile
      await api.post(
        "/api/profile/picture",
        { url: data.url },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await loadProfile();
      alert("✅ Profile picture uploaded successfully!");
      setSelectedFile(null);
      setPreview(null);
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ---------- Remove Profile Picture ----------
  function removePicture() {
    setProfile((prev) => ({ ...prev, picture_url: null }));
    alert("Profile picture removed (default avatar restored)");
  }

  // ---------- Save Profile Info ----------
  async function handleSave() {
    try {
      await saveProfile();
      alert("✅ Profile saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to save profile");
    }
  }

  if (!profile) return <p>Loading profile...</p>;

  // ---------- UI ----------
  return (
    <div className="profile-box">
      <h3>Profile Information</h3>

      {/* Profile Picture */}
      <div className="profile-picture">
        <img
          src={preview || profile.picture_url || "/uploads/default-avatar.png"}
          alt="Profile"
          className="profile-pic"
        />
      </div>

      <div className="profile-box">
        <h4>Update Info</h4>

        <label>Full Name *</label>
        <input
          value={profile.full_name || ""}
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
        />

        <label>Email *</label>
        <input
          value={profile.email || ""}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
        />

        <label>Phone *</label>
        <input
          value={profile.phone || ""}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        />

        <label>Location *</label>
        <input
          value={profile.location || ""}
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
        />

        <label>Headline</label>
        <input
          value={profile.title || ""}
          onChange={(e) => setProfile({ ...profile, title: e.target.value })}
        />

        <label>Short Bio</label>
        <textarea
          maxLength={500}
          value={profile.bio || ""}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        />

        <div className="button-group">
          <button onClick={handleSave}>Save</button>
          <button className="btn-secondary" onClick={loadProfile}>
            Cancel
          </button>
        </div>
      </div>

      {/* Picture Upload Section */}
      <div className="profile-box">
        <h4>Profile Picture</h4>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        {preview && <img src={preview} className="preview" alt="Preview" />}
        {uploading && <p>Uploading... {uploadProgress}%</p>}

        <div className="button-group">
          <button onClick={uploadPicture} disabled={uploading}>
            Replace Picture
          </button>
          <button className="btn-secondary" onClick={removePicture}>
            Remove
          </button>
        </div>
      </div>

      {/* LinkedIn Profile Optimization */}
      <div style={{ marginTop: '40px' }}>
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
      </div>

      {/* LinkedIn Message Templates */}
      <div style={{ marginTop: '40px' }}>
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
  );
}
