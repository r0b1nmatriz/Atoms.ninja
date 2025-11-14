#!/bin/bash
# Automated Google OAuth Setup and Deployment

set -e

BACKEND_IP="136.113.58.241"
VM_NAME="atoms-kali-security"
ZONE="us-central1-a"

echo "🚀 Automated Google OAuth Setup for Atoms Ninja"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Open Google Console for OAuth setup
echo ""
echo "📋 Step 1: Create OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Opening Google Cloud Console..."
echo "Please follow these steps in the browser:"
echo ""
echo "1. Configure OAuth Consent Screen (if not done):"
echo "   - User Type: External"
echo "   - App name: Atoms Ninja"
echo "   - Add scopes: userinfo.email, userinfo.profile"
echo ""
echo "2. Create OAuth Client ID:"
echo "   - Type: Web application"
echo "   - Authorized redirect URIs:"
echo "     * http://$BACKEND_IP:3002/auth/google/callback"
echo "     * https://www.atoms.ninja/auth/callback"
echo ""
echo "3. Copy Client ID and Client Secret"
echo ""

# Open browser
open "https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692" 2>/dev/null || \
xdg-open "https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692" 2>/dev/null || \
echo "Please visit: https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0528385692"

echo ""
read -p "Press ENTER when you have created the OAuth credentials..."

# Step 2: Input credentials
echo ""
echo "📝 Step 2: Enter OAuth Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Enter Google Client ID: " CLIENT_ID
read -p "Enter Google Client Secret: " CLIENT_SECRET

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Error: Client ID and Secret are required"
    exit 1
fi

# Step 3: Update .env file
echo ""
echo "📝 Step 3: Updating .env file"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup original .env
cp .env .env.backup.$(date +%s)

# Update .env with OAuth credentials
sed -i.bak "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$CLIENT_ID|" .env
sed -i.bak "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$CLIENT_SECRET|" .env
rm -f .env.bak

echo "✅ .env file updated"

# Step 4: Package for deployment
echo ""
echo "📦 Step 4: Creating deployment package"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

tar -czf backend-auth.tar.gz \
    package.json \
    package-lock.json \
    backend-server-auth.js \
    auth-manager.js \
    .env

echo "✅ Package created: backend-auth.tar.gz"

# Step 5: Upload to GCP
echo ""
echo "📤 Step 5: Uploading to GCP VM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gcloud compute scp backend-auth.tar.gz $VM_NAME:~/ --zone=$ZONE

echo "✅ Uploaded to VM"

# Step 6: Deploy on VM
echo ""
echo "🔧 Step 6: Deploying on GCP VM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gcloud compute ssh $VM_NAME --zone=$ZONE --command="
    set -e
    
    echo '🛑 Stopping backend service...'
    sudo systemctl stop atoms-backend || true
    
    echo '📂 Setting up files...'
    sudo rm -rf /opt/atoms-backend/*
    sudo tar -xzf ~/backend-auth.tar.gz -C /opt/atoms-backend/
    cd /opt/atoms-backend
    
    echo '📦 Installing dependencies...'
    sudo npm install --production 2>&1 | tail -5
    
    echo '⚙️  Configuring systemd service...'
    sudo tee /etc/systemd/system/atoms-backend.service > /dev/null <<'EOF'
[Unit]
Description=Atoms Ninja Backend with Google OAuth
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
    
    echo '🚀 Starting backend service...'
    sudo systemctl daemon-reload
    sudo systemctl enable atoms-backend
    sudo systemctl start atoms-backend
    
    echo ''
    echo '⏳ Waiting for service to start...'
    sleep 5
    
    echo ''
    echo '📊 Service Status:'
    sudo systemctl status atoms-backend --no-pager -l | head -20
    
    echo ''
    echo '🏥 Health Check:'
    curl -s http://localhost:3002/health | head -10
"

# Cleanup
rm backend-auth.tar.gz

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Backend URL: http://$BACKEND_IP:3002"
echo "🔐 Login: http://$BACKEND_IP:3002/auth/google"
echo "🏥 Health: http://$BACKEND_IP:3002/health"
echo ""
echo "🧪 Test Authentication:"
echo "  curl http://$BACKEND_IP:3002/health"
echo "  # Then visit: http://$BACKEND_IP:3002/auth/google"
echo ""
echo "📝 User data is collected and stored securely"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
