#!/bin/bash
# Autonomous OAuth Setup & Deployment
# This script will deploy with mock credentials for now and update later

set -e

BACKEND_IP="136.113.58.241"
VM_NAME="atoms-kali-security"
ZONE="us-central1-a"

echo "🚀 Autonomous OAuth Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Note: You'll need to create OAuth credentials manually at:"
echo "https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692"
echo ""
echo "For now, deploying with placeholder credentials..."
echo "Update .env file on the server after creating real credentials."
echo ""

# Use placeholder credentials for initial deployment
CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Update .env
echo "📝 Updating .env file..."
cp .env .env.backup.$(date +%s)
sed -i.bak "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$CLIENT_ID|" .env
sed -i.bak "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$CLIENT_SECRET|" .env
rm -f .env.bak

# Package
echo "📦 Creating deployment package..."
tar -czf backend-auth.tar.gz \
    package.json \
    package-lock.json \
    backend-server-auth.js \
    auth-manager.js \
    .env

echo "✅ Package created"

# Upload
echo "📤 Uploading to GCP VM..."
gcloud compute scp backend-auth.tar.gz $VM_NAME:~/ --zone=$ZONE

echo "✅ Uploaded"

# Deploy
echo "🔧 Deploying on GCP VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --command="
    set -e
    
    echo '🛑 Stopping backend...'
    sudo systemctl stop atoms-backend || true
    
    echo '📂 Setting up files...'
    sudo rm -rf /opt/atoms-backend/*
    sudo tar -xzf ~/backend-auth.tar.gz -C /opt/atoms-backend/
    cd /opt/atoms-backend
    
    echo '📦 Installing dependencies...'
    sudo npm install --production 2>&1 | tail -5
    
    echo '⚙️  Configuring service...'
    sudo tee /etc/systemd/system/atoms-backend.service > /dev/null <<'EOF'
[Unit]
Description=Atoms Ninja Backend with OAuth
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
    
    echo '🚀 Starting backend...'
    sudo systemctl daemon-reload
    sudo systemctl enable atoms-backend
    sudo systemctl start atoms-backend
    
    sleep 5
    
    echo ''
    echo '📊 Service Status:'
    sudo systemctl status atoms-backend --no-pager | head -20
    
    echo ''
    echo '🏥 Health Check:'
    curl -s http://localhost:3002/health || echo 'Waiting for service...'
"

# Cleanup
rm backend-auth.tar.gz

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Backend: http://$BACKEND_IP:3002"
echo "🏥 Health: http://$BACKEND_IP:3002/health"
echo ""
echo "📝 Next Steps:"
echo "1. Create OAuth credentials at:"
echo "   https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692"
echo ""
echo "2. Update .env on the server:"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE"
echo "   sudo nano /opt/atoms-backend/.env"
echo "   # Add your real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
echo ""
echo "3. Restart the service:"
echo "   sudo systemctl restart atoms-backend"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
