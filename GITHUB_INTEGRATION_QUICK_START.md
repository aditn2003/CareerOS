# GitHub Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Run Database Migrations

```bash
cd backend/db
node run_github_migration.js
node run_private_repo_migration.js
```

### 2. Verify Backend Routes

The following routes should be available:
- `POST /api/github/connect`
- `POST /api/github/sync`
- `GET /api/github/repositories`
- `GET /api/github/settings`
- `PUT /api/github/settings`
- `PUT /api/github/repositories/:repoId/feature`
- `POST /api/github/repositories/:repoId/skills`
- `GET /api/github/stats`

### 3. Test in Browser

1. **Login** to your account
2. **Navigate** to Profile → GitHub Tab
3. **Connect** your GitHub account:
   - Click "Connect GitHub"
   - Enter your GitHub username
   - Click "Connect"
4. **Sync** repositories:
   - Click "Sync Repositories" button
   - Wait 10-30 seconds
   - Verify repositories appear
5. **Explore**:
   - Feature a repository (click star icon)
   - Link skills to a repository
   - Filter and sort repositories
   - Toggle private repos (if you have a token)

---

## ✅ Feature Verification Checklist

### Basic Features
- [ ] Can connect GitHub account
- [ ] Can sync repositories
- [ ] Repositories display correctly
- [ ] Can feature/unfeature repos
- [ ] Can link skills to repos
- [ ] Statistics show correct counts

### Advanced Features
- [ ] Private repo toggle works
- [ ] Filters work (featured, language)
- [ ] Sorting works (stars, updated, etc.)
- [ ] Featured section appears at top
- [ ] Settings persist after refresh

### Error Handling
- [ ] Invalid username shows error
- [ ] Missing token shows warning for private repos
- [ ] Rate limit errors handled gracefully

---

## 🧪 Quick API Tests

### Test Connection
```bash
curl -X POST http://localhost:4000/api/github/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"github_username": "octocat"}'
```

### Test Sync
```bash
curl -X POST http://localhost:4000/api/github/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Get Repositories
```bash
curl http://localhost:4000/api/github/repositories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Get Settings
```bash
curl http://localhost:4000/api/github/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "GitHub user not found" | Check username spelling |
| "Rate limit exceeded" | Wait 1 hour or add token |
| Private repos not showing | Enable toggle AND add token |
| Skills not linking | Add skills to profile first |
| Sync takes too long | Normal for many repos, be patient |

---

## 🎯 Key Features Summary

1. **Connect**: Link your GitHub account
2. **Sync**: Import all your repositories
3. **Feature**: Highlight your best projects
4. **Link Skills**: Show which skills you used
5. **Private Control**: Choose to include/exclude private repos
6. **Statistics**: See your GitHub activity at a glance

---

**For detailed testing, see**: `GITHUB_INTEGRATION_TESTING_GUIDE.md`

