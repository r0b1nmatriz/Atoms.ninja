# 🔗 GitHub + Vercel Integration Guide

**Quick Setup: 3 Minutes**

---

## 🚀 Current Status

✅ **GitHub Repository:** https://github.com/r0b1nmatriz/Atoms.ninja
✅ **Vercel Project:** https://vercel.com/achuashwin98-4594s-projects/atoms
✅ **Live Site:** https://www.atoms.ninja

⏳ **Needs:** Connect GitHub to Vercel for auto-deployment

---

## 📋 Setup Steps

### 1. Open Vercel Settings
```
https://vercel.com/achuashwin98-4594s-projects/atoms/settings/git
```

### 2. Click "Connect Git Repository"
Look for the Git Repository section and click the button.

### 3. Select GitHub
Choose GitHub from the list of Git providers.

### 4. Authorize Vercel (if needed)
Grant Vercel access to your GitHub account.

### 5. Select Repository
Search for: **r0b1nmatriz/Atoms.ninja**
Click to connect.

### 6. Configure Settings
- **Production Branch:** main
- **Install Vercel for GitHub:** Yes (if prompted)

### 7. Click "Connect"
✅ Done!

---

## ✅ Verification

Check if connected:
```bash
vercel ls --prod
```

Should show:
- Source: github
- Repo: r0b1nmatriz/Atoms.ninja

---

## 🧪 Test Auto-Deploy

```bash
cd /Users/admin/atoms

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test auto-deploy"
git push origin main
```

**Watch deployment:**
https://vercel.com/achuashwin98-4594s-projects/atoms

You should see a new deployment start automatically! 🎉

---

## 🔄 Your New Workflow

```bash
# 1. Make changes
vim script.js

# 2. Commit
git add .
git commit -m "Updated feature"

# 3. Push
git push origin main

# 4. Vercel auto-deploys! (2-3 minutes)
# Check: https://www.atoms.ninja
```

---

## ⚠️ Troubleshooting

### Can't see repository?
1. Make sure logged into GitHub as **r0b1nmatriz**
2. Repository visibility: Public
3. Install Vercel GitHub App: https://github.com/apps/vercel

### Auto-deploy not working?
1. Check webhook: https://github.com/r0b1nmatriz/Atoms.ninja/settings/hooks
2. Should see Vercel webhook
3. Recent deliveries should show successful pings

### Manual deploy still works:
```bash
vercel --prod
```

---

## 📊 What Happens on Push

```
git push origin main
    ↓
GitHub webhook triggers
    ↓
Vercel receives notification
    ↓
Vercel clones repo
    ↓
Vercel builds project
    ↓
Vercel deploys to production
    ↓
Live on www.atoms.ninja (2-3 min)
```

---

## 🎯 Benefits

✅ **No manual deployments needed**
✅ **Faster updates** (just git push)
✅ **Deployment history** tracked
✅ **Automatic rollback** if issues
✅ **Preview deployments** for PRs

---

## 📚 Resources

- Vercel Docs: https://vercel.com/docs/git
- GitHub Integration: https://vercel.com/docs/deployments/git/vercel-for-github
- Project Dashboard: https://vercel.com/achuashwin98-4594s-projects/atoms

---

**Ready to connect? Open the link and follow the steps!** 🚀

*Updated: 2025-11-09*
