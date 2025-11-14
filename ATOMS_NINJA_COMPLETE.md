# 🥷 Atoms.Ninja - Complete Integrated Platform

## Overview

**Atoms.Ninja** is an AI-powered penetration testing platform that combines:

✅ **AI-Driven Hacking** - Natural language to autonomous attack chains  
✅ **Metasploit Integration** - Payload generation & exploitation  
✅ **500+ Security Tools** - Full Kali Linux arsenal  
✅ **Session Management** - Track operations & vulnerabilities

---

## 🎯 Core Features

### 1. **AI-Driven Hacking (Atom AI)**

Your AI assistant "Atom" understands natural language and executes attacks:

```
You: "scan example.com"
Atom: "Roger that, Chief. Initiating recon..."
      → Auto-executes: nmap, whois, dig, whatweb
      → Shows: Open ports, services, technologies
      → Suggests: Next attack vectors

You: "find sql injection"
Atom: "Copy. Scanning for SQLi vectors..."
      → Auto-executes: sqlmap with smart options
      → Shows: Vulnerable parameters found
      → Suggests: Exploitation commands
```

**Capabilities:**
- Autonomous attack chains
- Intelligent tool selection
- Context-aware operations
- Military-style briefings
- Results-only output

### 2. **Metasploit Integration**

#### Easy Mode (`/metasploit-easy.html`)
3-step wizard for beginners:
1. Choose platform (Windows/Linux/Android/PHP)
2. Auto-detect IP & configure
3. Download payload + listener starts

#### Advanced Mode (`/metasploit.html`)
Full control for experts:
- Custom encoders & iterations
- Manual listener configuration
- All Metasploit options available

### 3. **500+ Security Tools**

Access to full Kali arsenal:
- **Recon**: nmap, masscan, amass, subfinder
- **Web**: sqlmap, nikto, dirb, wfuzz
- **Exploit**: metasploit, searchsploit
- **Password**: hydra, john, hashcat
- **Wireless**: aircrack-ng
- **Forensics**: binwalk, volatility

### 4. **Session Management**

- Track all scans & exploits
- Vulnerability database
- Risk scoring
- Export reports
- Persistent history

---

## 🚀 Quick Start

### Option 1: Full Deployment (Recommended)

```bash
cd /Users/admin/atoms

# Deploy everything at once
./deploy-atoms-complete.sh
```

This will:
1. Deploy Metasploit server to GCP
2. Configure firewall rules  
3. Update frontend configuration
4. Test all components

### Option 2: Step-by-Step

```bash
# 1. Deploy Metasploit server only
./gcp-metasploit-deploy.sh

# 2. Check status
./gcp-metasploit-status.sh

# 3. Use the platform
# Visit: https://www.atoms.ninja
```

---

## 💻 Usage Examples

### AI-Driven Hacking

**Simple Scan:**
```
You: "scan 192.168.1.1"
Atom: "Target acquired. Scanning..."
      [Executes nmap -sV -sC 192.168.1.1]
      
      ✅ Results:
      Port 22: SSH (OpenSSH 7.4)
      Port 80: HTTP (Apache 2.4.6)
      Port 3306: MySQL (5.7.31)
      
      🎯 Attack vectors:
      - SSH brute force
      - Web vulnerability scan
      - SQL injection testing
```

**Advanced Operation:**
```
You: "find subdomains of example.com then scan them"
Atom: "Roger. Multi-stage op initiated..."
      [Phase 1: subfinder + amass]
      [Phase 2: nmap on each subdomain]
      
      📊 Discovered 15 subdomains
      🎯 3 have critical services exposed
      ⚠️  2 potential vulnerabilities found
```

### Metasploit Easy Mode

1. Visit: `https://www.atoms.ninja/metasploit-easy.html`
2. Click platform: 💻 **Windows**
3. Your IP: `34.123.45.67` (auto-detected)
4. Enable: ☑️ **AV Evasion**
5. Click: **Generate**
6. Download: `payload_windows_1234.exe`
7. Listener: ✅ **Active on port 4444**

### Metasploit API

**One-Click Setup:**
```bash
curl -X POST http://YOUR_MSF_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "windows",
    "lhost": "YOUR_IP",
    "lport": 4444,
    "encode": true
  }'
```

**Download Payload:**
```bash
curl http://YOUR_MSF_IP:3001/api/payload/download/payload_*.exe \
  -o payload.exe
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ATOMS.NINJA                           │
│                www.atoms.ninja                           │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   AI Backend     │          │  Metasploit API  │
│   (Vercel)       │          │   (GCP Server)   │
│                  │          │                  │
│ • OpenAI API     │          │ • msfvenom       │
│ • Gemini API     │          │ • msfconsole     │
│ • Multi-AI       │          │ • Payloads       │
│ • Auto-execute   │          │ • Listeners      │
└──────────────────┘          └──────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  500+ Kali Tools │
              │                  │
              │ nmap, sqlmap,    │
              │ hydra, nikto,    │
              │ searchsploit...  │
              └──────────────────┘
```

---

## 📋 Component Details

### Frontend (Vercel)
- **Location**: `https://www.atoms.ninja`
- **Tech**: HTML, CSS, JavaScript
- **Features**: 
  - AI chat interface
  - Metasploit wizards
  - Session management
  - Real-time updates

### AI Backend (Vercel Functions)
- **Endpoint**: `/api/multi-ai`
- **Providers**: OpenAI (primary), Gemini (fallback)
- **Features**:
  - Natural language processing
  - Command generation
  - Auto-execution
  - Smart tool selection

### Metasploit Server (GCP)
- **Location**: GCP Compute Engine
- **API**: Port 3001
- **Features**:
  - Payload generation
  - Listener management
  - Session tracking
  - File downloads

### Tool Execution
- **Location**: Metasploit server
- **Access**: Via `/api/execute` endpoint
- **Whitelisted**: 50+ security tools
- **Features**: Timeout, rate limiting, logging

---

## 🔌 API Reference

### AI API

**Endpoint:** `POST /api/multi-ai`

**Request:**
```json
{
  "message": "scan example.com",
  "chatHistory": [],
  "sessionData": {}
}
```

**Response:**
```json
{
  "response": "Roger, Chief. Scanning target...",
  "commands": ["nmap -sV example.com"],
  "results": "...",
  "suggestions": ["Try port 80", "Check SSL cert"]
}
```

### Metasploit API

**Quick Setup:**
```bash
POST /api/quick-setup
{
  "platform": "windows|linux|android|php",
  "lhost": "YOUR_IP",
  "lport": 4444,
  "encode": true
}
```

**Generate Payload:**
```bash
POST /api/payload/generate
{
  "platform": "windows",
  "lhost": "IP",
  "lport": 4444,
  "encode": true
}
```

**Start Listener:**
```bash
POST /api/listener/start
{
  "platform": "windows",
  "lhost": "0.0.0.0",
  "lport": 4444
}
```

**Check Status:**
```bash
GET /api/listener/status/:jobId
```

**List Listeners:**
```bash
GET /api/listener/list
```

**Download Payload:**
```bash
GET /api/payload/download/:filename
```

---

## 🛠️ Management

### Check Status
```bash
./gcp-metasploit-status.sh
```

### View Logs
```bash
# Metasploit API logs
gcloud compute ssh metasploit-server \
  --command='journalctl -u metasploit-api -f'

# System logs
gcloud compute ssh metasploit-server \
  --command='tail -f /var/log/syslog'
```

### Start/Stop Server
```bash
# Stop (save money)
gcloud compute instances stop metasploit-server --zone=us-central1-a

# Start
gcloud compute instances start metasploit-server --zone=us-central1-a
```

### Update Metasploit
```bash
gcloud compute ssh metasploit-server

# Update Metasploit
sudo msfupdate

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## 💰 Costs

### Vercel (Frontend + AI API)
- **Free tier**: Sufficient for most use
- **Pro tier**: $20/month (if needed)

### GCP (Metasploit Server)
- **e2-micro**: ~$7/month (testing)
- **e2-standard-2**: ~$50/month (recommended)
- **n1-standard-4**: ~$140/month (heavy usage)

**Cost Saving:**
- Stop when not in use
- Use preemptible instances (80% cheaper)
- Set auto-shutdown schedules

---

## 🔒 Security

### Best Practices

1. **Restrict Access**
```bash
# Limit Metasploit to your IP only
gcloud compute firewall-rules update metasploit-api \
  --source-ranges YOUR_IP/32
```

2. **Enable HTTPS**
```bash
# On Metasploit server
sudo certbot --nginx -d your-domain.com
```

3. **Add Authentication**
```bash
# Set API key in environment
export API_KEY="your-secret-key-here"
```

4. **Regular Updates**
```bash
# Weekly updates recommended
sudo apt update && sudo apt upgrade -y
sudo msfupdate
```

5. **Monitor Logs**
```bash
# Set up log monitoring
gcloud logging read "resource.type=gce_instance"
```

---

## 📚 Documentation

- **Quick Start**: This file
- **Metasploit Guide**: `METASPLOIT_GUIDE.md`
- **GCP Deployment**: `GCP_METASPLOIT_EASY.md`
- **API Documentation**: `GCP_METASPLOIT_AUTOMATION.md`
- **Original Setup**: `METASPLOIT_SETUP_COMPLETE.md`

---

## ⚠️ Legal & Ethical Use

**CRITICAL WARNINGS:**

✅ **Legal Use:**
- Test your own systems
- Client systems with **written permission**
- Bug bounty programs (follow rules)
- Authorized penetration tests
- Educational/research purposes

❌ **ILLEGAL:**
- Unauthorized access
- Testing without permission
- Malicious activities
- Data theft
- Service disruption

**Consequences:**
- Criminal prosecution
- Heavy fines
- Imprisonment
- Permanent record

**Always:**
- Get written authorization
- Document all activities
- Follow responsible disclosure
- Respect privacy and laws

---

## 🎉 Summary

You now have **Atoms.Ninja** - a complete AI-powered penetration testing platform:

✅ **AI-Driven Hacking** - Talk to Atom, get results  
✅ **Metasploit Integration** - Easy & Advanced modes  
✅ **500+ Tools** - Full Kali arsenal  
✅ **Cloud-Based** - Access anywhere  
✅ **Cost-Efficient** - Pay only when running  
✅ **Secure** - Firewalls, auth, HTTPS ready  
✅ **Documented** - Complete guides included

### Quick Commands

```bash
# Deploy everything
./deploy-atoms-complete.sh

# Check status  
./gcp-metasploit-status.sh

# Use platform
open https://www.atoms.ninja

# Test AI
# Visit site, type: "scan example.com"

# Test Metasploit
# Visit: /metasploit-easy.html
```

---

**Ready to hack, Chief!** 🥷💻🔒

Visit **https://www.atoms.ninja** and start exploiting!

Remember: **Only authorized systems. Always ethical. Always legal.**
