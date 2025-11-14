#!/bin/bash
# Deploy Atoms Ninja Backend to GCP VM

set -e

VM_NAME="atoms-kali-security"
ZONE="us-central1-a"
BACKEND_PORT="3002"
PROJECT_DIR="/opt/atoms-backend"

echo "🚀 Deploying Atoms Ninja Backend to GCP VM: $VM_NAME"

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf backend-deploy.tar.gz \
    package.json \
    package-lock.json \
    gemini-proxy.js \
    .env

# Copy to VM
echo "📤 Uploading to VM..."
gcloud compute scp backend-deploy.tar.gz $VM_NAME:~/ --zone=$ZONE

# Deploy on VM
echo "🔧 Installing backend on VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="
    set -e
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        echo '📦 Installing Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Setup backend directory
    sudo mkdir -p $PROJECT_DIR
    sudo tar -xzf ~/backend-deploy.tar.gz -C $PROJECT_DIR
    cd $PROJECT_DIR
    
    # Install dependencies
    echo '📦 Installing dependencies...'
    sudo npm install --production
    
    # Setup systemd service
    echo '⚙️  Creating systemd service...'
    sudo tee /etc/systemd/system/atoms-backend.service > /dev/null <<EOF
[Unit]
Description=Atoms Ninja Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node gemini-proxy.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload and start service
    sudo systemctl daemon-reload
    sudo systemctl enable atoms-backend
    sudo systemctl restart atoms-backend
    
    # Configure firewall
    echo '🔥 Configuring firewall...'
    sudo ufw allow $BACKEND_PORT/tcp || true
    
    # Check status
    sleep 3
    sudo systemctl status atoms-backend --no-pager
    
    echo '✅ Backend deployed and running!'
    echo '🌐 Endpoint: http://\$(curl -s ifconfig.me):$BACKEND_PORT'
"

# Update GCP firewall rule
echo "🔥 Updating GCP firewall..."
gcloud compute firewall-rules create atoms-backend-allow \
    --allow=tcp:$BACKEND_PORT \
    --source-ranges=0.0.0.0/0 \
    --target-tags=kali-security \
    --description="Allow Atoms Backend API" \
    2>/dev/null || echo "Firewall rule already exists"

# Get VM external IP
EXTERNAL_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Backend API URL: http://$EXTERNAL_IP:$BACKEND_PORT"
echo "🏥 Health Check: http://$EXTERNAL_IP:$BACKEND_PORT/health"
echo "🔧 API Endpoint: http://$EXTERNAL_IP:$BACKEND_PORT/api/multi-ai"
echo ""
echo "📝 Update your frontend config.js with:"
echo "   BACKEND_API_URL: 'http://$EXTERNAL_IP:$BACKEND_PORT'"
echo ""
echo "🔍 Check logs: gcloud compute ssh $VM_NAME --zone=$ZONE --command='sudo journalctl -u atoms-backend -f'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cleanup
rm backend-deploy.tar.gz
