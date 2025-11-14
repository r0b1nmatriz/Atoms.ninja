#!/bin/bash
# Deploy Updated Backend with all API routes to GCP

set -e

VM_NAME="atoms-kali-security"
ZONE="us-central1-a"
BACKEND_PORT="3002"
PROJECT_DIR="/opt/atoms-backend"

echo "🚀 Deploying Updated Backend to GCP VM"

# Create deployment package with API routes
echo "📦 Creating deployment package..."
mkdir -p temp-deploy/api
cp package.json package-lock.json .env temp-deploy/
cp api/index.js temp-deploy/api/
cp api/*.js temp-deploy/api/ 2>/dev/null || true

# Create a simple server wrapper
cat > temp-deploy/server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Import and use the unified API handler
const apiHandler = require('./api/index.js');
app.use('/api', apiHandler);
app.use('/', apiHandler);

// Direct health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Atoms Ninja Backend', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Atoms Ninja Backend running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 API: http://localhost:${PORT}/api/multi-ai`);
});
EOF

cd temp-deploy
tar -czf ../backend-updated.tar.gz .
cd ..
rm -rf temp-deploy

# Deploy to VM
echo "📤 Uploading to VM..."
gcloud compute scp backend-updated.tar.gz $VM_NAME:~/ --zone=$ZONE

echo "🔧 Installing on VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="
    set -e
    
    # Stop existing service
    sudo systemctl stop atoms-backend 2>/dev/null || true
    
    # Setup directory
    sudo rm -rf $PROJECT_DIR
    sudo mkdir -p $PROJECT_DIR
    sudo tar -xzf ~/backend-updated.tar.gz -C $PROJECT_DIR
    cd $PROJECT_DIR
    
    # Install dependencies
    sudo npm install --production 2>&1 | tail -5
    
    # Update systemd service
    sudo tee /etc/systemd/system/atoms-backend.service > /dev/null <<EOFS
[Unit]
Description=Atoms Ninja Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT

[Install]
WantedBy=multi-user.target
EOFS
    
    # Start service
    sudo systemctl daemon-reload
    sudo systemctl enable atoms-backend
    sudo systemctl start atoms-backend
    
    # Wait and check
    sleep 3
    sudo systemctl status atoms-backend --no-pager -l
    
    echo ''
    echo '✅ Backend updated and running!'
"

# Get IP
EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Backend: http://$EXTERNAL_IP:$BACKEND_PORT"
echo "🏥 Health: http://$EXTERNAL_IP:$BACKEND_PORT/health"
echo "🤖 AI API: http://$EXTERNAL_IP:$BACKEND_PORT/api/multi-ai"
echo ""
echo "🧪 Test it:"
echo "  curl http://$EXTERNAL_IP:$BACKEND_PORT/health"

# Cleanup
rm backend-updated.tar.gz
