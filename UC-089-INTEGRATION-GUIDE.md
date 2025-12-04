# UC-089 Integration Guide - Where to Add Components

## 🎯 Find Your Profile/Networking Page

### Option 1: Existing Profile Page
```
Look for one of these files:
- frontend/src/pages/Profile.jsx
- frontend/src/pages/ProfilePage.jsx
- frontend/src/components/Profile.jsx
- frontend/src/components/ProfilePage.jsx
```

### Option 2: Existing Networking Page
```
Look for one of these files:
- frontend/src/pages/Networking.jsx
- frontend/src/pages/LinkedIn.jsx
- frontend/src/components/Networking.jsx
- frontend/src/components/NetworkingPage.jsx
- frontend/src/components/NetworkingEvents.jsx
```

### Option 3: Create New Page
```
If no profile/networking page exists, create:
frontend/src/pages/LinkedIn.jsx

Then add route to your router:
import LinkedIn from './pages/LinkedIn';
<Route path="/linkedin" element={<LinkedIn />} />
```

---

## 📝 Step-by-Step Integration

### BEFORE: Your Current Profile Page
```jsx
// frontend/src/pages/Profile.jsx
import React from 'react';
import ProfileHeader from '../components/ProfileHeader';
import ProfileForm from '../components/ProfileForm';

export default function Profile() {
  const user = useUser(); // Your existing user data

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      <ProfileHeader user={user} />
      <ProfileForm user={user} />
    </div>
  );
}
```

### AFTER: With LinkedIn Components
```jsx
// frontend/src/pages/Profile.jsx
import React from 'react';
import ProfileHeader from '../components/ProfileHeader';
import ProfileForm from '../components/ProfileForm';
// ✅ ADD THESE IMPORTS
import LinkedInProfileOptimization from '../components/LinkedInProfileOptimization';
import LinkedInMessageTemplates from '../components/LinkedInMessageTemplates';

export default function Profile() {
  const user = useUser(); // Your existing user data

  // ✅ CREATE USER PROFILE OBJECT
  const userProfile = {
    headline: user?.linkedin_headline || user?.headline || "",
    about: user?.about || user?.bio || "",
    skills: user?.skills || [],
    job_title: user?.job_title || user?.position || "",
    company_name: user?.company_name || user?.company || "",
    industry: user?.industry || "",
    first_name: user?.first_name || user?.name?.split(' ')[0] || "User",
    seniority: user?.seniority || "Mid-level"
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>
      <ProfileHeader user={user} />
      <ProfileForm user={user} />

      {/* ✅ ADD THESE SECTIONS */}
      
      {/* LinkedIn Profile Optimization */}
      <section className="linkedin-optimization-section">
        <LinkedInProfileOptimization userProfile={userProfile} />
      </section>

      {/* LinkedIn Message Templates */}
      <section className="linkedin-templates-section">
        <LinkedInMessageTemplates userProfile={userProfile} />
      </section>
    </div>
  );
}
```

---

## 🎨 Optional: Add Section Styling

### In your CSS file or global styles:
```css
/* LinkedIn Integration Sections */
.linkedin-optimization-section {
  margin-top: 40px;
  padding: 20px 0;
  border-top: 2px solid #e5e7eb;
}

.linkedin-templates-section {
  margin-top: 40px;
  padding: 20px 0;
}

/* Add spacing between sections */
.linkedin-optimization-section ~ .linkedin-templates-section {
  border-top: 2px solid #e5e7eb;
}

/* Optional: Dark mode support */
@media (prefers-color-scheme: dark) {
  .linkedin-optimization-section,
  .linkedin-templates-section {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 20px;
  }
}
```

---

## 🔍 Variable Mapping Reference

### If Your User Fields Are Different

**Common field name variations:**

| Standard | Variations |
|----------|-----------|
| headline | linkedin_headline, title |
| about | about_section, bio, summary |
| skills | skills_array, competencies |
| job_title | position, role, current_title |
| company_name | company, organization |
| industry | industry_name, sector |
| first_name | firstName, given_name |
| seniority | experience_level, level |

**Adjust mapping in userProfile object:**
```jsx
const userProfile = {
  // ✅ THESE ARE CORRECT:
  headline: user?.linkedin_headline || user?.headline || "",
  about: user?.about || user?.bio || "",
  
  // ✅ CUSTOMIZE IF YOUR FIELDS ARE DIFFERENT:
  // If you use "position" instead of "job_title":
  job_title: user?.position || user?.job_title || "",
  
  // If you use "organization" instead of "company_name":
  company_name: user?.organization || user?.company_name || "",
  
  // Add all your other fields...
};
```

---

## ✅ Integration Checklist

When adding components:

- [ ] Import statements added at top
- [ ] userProfile object created with correct field mapping
- [ ] Both components added to render
- [ ] Component sections styled (optional)
- [ ] Page loads without console errors
- [ ] "Analyze My Profile" button works
- [ ] "Generate Templates" button works
- [ ] Components responsive on mobile

---

## 🧪 Testing After Integration

### 1. Check Console (F12 → Console)
```
Should see NO red error messages
May see info messages (OK)
```

### 2. Check Network (F12 → Network)
```
POST /api/linkedin/optimize-profile → 200 OK
POST /api/linkedin/generate-templates → 200 OK
```

### 3. User Actions
```
✅ Click "Analyze My Profile" → scores appear
✅ Click suggestions to expand
✅ Click "Generate Templates" → templates appear
✅ Click copy button → text copies to clipboard
```

### 4. Mobile Test
```
Resize browser to 320px width
✅ Should still look good
✅ Buttons still clickable
```

---

## 🎨 Layout Examples

### Example 1: Full-Width Sections
```jsx
<div className="profile-page">
  <h1>My Profile</h1>
  <ProfileForm user={user} />
  
  <section style={{ marginTop: '40px' }}>
    <LinkedInProfileOptimization userProfile={userProfile} />
  </section>
  
  <section style={{ marginTop: '40px' }}>
    <LinkedInMessageTemplates userProfile={userProfile} />
  </section>
</div>
```

### Example 2: Tabbed Interface
```jsx
<div className="profile-page">
  <nav className="profile-tabs">
    <button onClick={() => setTab('basic')}>Basic Info</button>
    <button onClick={() => setTab('linkedin')}>LinkedIn Tools</button>
  </nav>
  
  {tab === 'basic' && <ProfileForm user={user} />}
  {tab === 'linkedin' && (
    <>
      <LinkedInProfileOptimization userProfile={userProfile} />
      <LinkedInMessageTemplates userProfile={userProfile} />
    </>
  )}
</div>
```

### Example 3: Sidebar Layout
```jsx
<div className="profile-page">
  <div className="profile-main">
    <ProfileForm user={user} />
  </div>
  
  <aside className="profile-sidebar">
    <LinkedInProfileOptimization userProfile={userProfile} />
    <LinkedInMessageTemplates userProfile={userProfile} />
  </aside>
</div>
```

---

## 🔐 Environment Variables

Ensure your `.env` or `.env.local` has:

```
# Already set in most projects:
VITE_API_BASE=http://localhost:4000/api

# For production, change to:
# VITE_API_BASE=https://your-api-domain.com/api
```

---

## 🚨 Common Integration Issues

### Issue: Components not rendering
```
❌ Check: Are imports correct?
✅ Solution: Copy exact path to component file
```

### Issue: "Cannot read property of undefined"
```
❌ Check: Are all userProfile fields defined?
✅ Solution: Use fallback values (|| "") for all fields
```

### Issue: Buttons don't work
```
❌ Check: Is API_BASE correct?
✅ Solution: Verify VITE_API_BASE in .env
```

### Issue: No console errors but nothing happens
```
❌ Check: Is auth token available?
✅ Solution: Verify user is logged in first
```

---

## 🎯 Most Common Integration (Copy-Paste Ready)

```jsx
// frontend/src/pages/Profile.jsx

import React, { useState, useEffect } from 'react';
import LinkedInProfileOptimization from '../components/LinkedInProfileOptimization';
import LinkedInMessageTemplates from '../components/LinkedInMessageTemplates';

// Your existing imports...

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Your existing user loading code
    loadUserData();
  }, []);

  const userProfile = {
    headline: user?.headline || "",
    about: user?.about || "",
    skills: user?.skills || [],
    job_title: user?.job_title || "",
    company_name: user?.company || "",
    industry: user?.industry || "",
    first_name: user?.first_name || "User",
    seniority: "Mid-level"
  };

  return (
    <div className="profile-container">
      {/* Your existing profile content */}
      
      <div style={{ marginTop: '60px' }}>
        <LinkedInProfileOptimization userProfile={userProfile} />
      </div>

      <div style={{ marginTop: '60px' }}>
        <LinkedInMessageTemplates userProfile={userProfile} />
      </div>
    </div>
  );
}
```

---

## ✨ You're Ready!

1. Copy the code above
2. Adjust field names for your user object
3. Save and test
4. Done! ✅

---

## 📞 Need Help?

**Check these files:**
- `UC-089-QUICK-START.md` - General setup
- `UC-089-IMPLEMENTATION-COMPLETE.md` - Technical details
- Component files - JSDoc comments explain everything

**Check console (F12):**
- Look for error messages
- Network tab shows API calls
- Application tab shows token
