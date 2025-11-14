# 🔐 Google OAuth Setup for Atoms Ninja

## Quick Setup (5 minutes)

### Step 1: Enable APIs
Go to: https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692

### Step 2: Configure OAuth Consent Screen

1. Click **"OAuth consent screen"** in the left menu
2. Select **"External"** as User Type → Click **Continue**
3. Fill in the form:
   - **App name:** Atoms Ninja
   - **User support email:** Your Gmail address
   - **App logo:** (Optional)
   - **App domain:** https://www.atoms.ninja
   - **Authorized domains:** atoms.ninja
   - **Developer contact:** Your Gmail address
4. Click **Save and Continue**

5. **Scopes** page:
   - Click **Add or Remove Scopes**
   - Select:
     - ✅ `userinfo.email`
     - ✅ `userinfo.profile`
   - Click **Update** → **Save and Continue**

6. **Test users** (for testing before verification):
   - Click **Add Users**
   - Add your email and any test users
   - Click **Save and Continue**

7. Click **Back to Dashboard**

### Step 3: Create OAuth Client ID

1. Click **"Credentials"** in the left menu
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Configure:
   - **Application type:** Web application
   - **Name:** Atoms Ninja Web Client
   
4. **Authorized JavaScript origins:**
   ```
   http://localhost:3002
   http://136.113.58.241:3002
   https://www.atoms.ninja
   ```

5. **Authorized redirect URIs:**
   ```
   http://localhost:3002/auth/google/callback
   http://136.113.58.241:3002/auth/google/callback
   https://www.atoms.ninja/auth/callback
   ```

6. Click **Create**

### Step 4: Save Credentials

You'll see a popup with:
- **Client ID:** (starts with something like `123456-abc.apps.googleusercontent.com`)
- **Client Secret:** (random string)

**Copy both values!**

### Step 5: Update .env File

Add to `/Users/admin/atoms/.env`:
```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

Replace `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with your actual values.

### Step 6: Install Dependencies

```bash
cd /Users/admin/atoms
npm install express-session google-auth-library
```

### Step 7: Deploy Updated Backend

```bash
# Package and deploy
tar -czf backend-auth.tar.gz \
  package.json \
  package-lock.json \
  backend-server-auth.js \
  auth-manager.js \
  .env

# Upload to GCP
gcloud compute scp backend-auth.tar.gz atoms-kali-security:~/ --zone=us-central1-a

# Install on VM
gcloud compute ssh atoms-kali-security --zone=us-central1-a --command='
  sudo systemctl stop atoms-backend
  sudo rm -rf /opt/atoms-backend/*
  sudo tar -xzf ~/backend-auth.tar.gz -C /opt/atoms-backend/
  cd /opt/atoms-backend
  sudo npm install
  sudo tee /etc/systemd/system/atoms-backend.service > /dev/null <<EOF
[Unit]
Description=Atoms Ninja Backend with Auth
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/atoms-backend
ExecStart=/usr/bin/node backend-server-auth.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl start atoms-backend
  sudo systemctl status atoms-backend --no-pager
'
```

---

## Testing Authentication

### 1. Check Backend Health
```bash
curl http://136.113.58.241:3002/health
```

Should show:
```json
{
  "status": "ok",
  "auth": {
    "enabled": true,
    "provider": "Google OAuth"
  }
}
```

### 2. Start Authentication Flow
Visit: `http://136.113.58.241:3002/auth/google`

This will redirect you to Google Sign-In.

### 3. After Login
You'll be redirected back to: `/?auth=success`

### 4. Check User Info
```bash
curl http://136.113.58.241:3002/auth/status
```

---

## User Data Collected

The system collects:
- ✅ Email address
- ✅ Full name
- ✅ Profile picture URL
- ✅ Email verification status
- ✅ Google user ID
- ✅ Login timestamps
- ✅ Last activity

Stored securely in session (24-hour expiry).

---

## API Usage After Authentication

All API endpoints now require authentication:

```bash
# Without auth
curl http://136.113.58.241:3002/api/multi-ai
# Returns: 401 Unauthorized

# With auth (browser with session cookie)
# Works normally
```

---

## Frontend Integration

Add to your frontend (`index.html` or separate auth page):

```html
<script>
// Check auth status
fetch('http://136.113.58.241:3002/auth/status', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  if (!data.authenticated) {
    // Redirect to login
    window.location.href = 'http://136.113.58.241:3002/auth/google';
  } else {
    // User is authenticated
    console.log('User:', data.user);
  }
});

// Logout button
document.getElementById('logout').addEventListener('click', () => {
  fetch('http://136.113.58.241:3002/auth/logout', {
    method: 'POST',
    credentials: 'include'
  }).then(() => window.location.reload());
});
</script>
```

---

## Quick Links

- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0528385692
- **Create Credentials:** https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692
- **API Dashboard:** https://console.cloud.google.com/apis/dashboard?project=gen-lang-client-0528385692

---

## Security Notes

1. ✅ Sessions expire after 24 hours
2. ✅ HTTPS required in production (use `secure: true` for cookies)
3. ✅ CORS configured for your domain
4. ✅ User data stored in memory (use Redis/DB in production)
5. ✅ OAuth tokens stored in session only
6. ⚠️ Change `SESSION_SECRET` in production

---

**Next:** After OAuth setup, test the authentication flow!
