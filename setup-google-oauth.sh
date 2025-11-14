#!/bin/bash
# Setup Google OAuth Credentials for Atoms Ninja

set -e

PROJECT_ID="gen-lang-client-0528385692"
REDIRECT_URI="http://136.113.58.241:3002/auth/google/callback"
FRONTEND_URL="https://www.atoms.ninja"

echo "🔐 Setting up Google OAuth for Atoms Ninja"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Enable required APIs
echo "📦 Enabling required Google APIs..."
gcloud services enable \
  iamcredentials.googleapis.com \
  oauth2.googleapis.com \
  --project=$PROJECT_ID

echo ""
echo "✅ Google OAuth Setup Instructions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Since OAuth consent screen and credentials must be created via console,"
echo "please follow these steps:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "2. Configure OAuth Consent Screen:"
echo "   - Click 'OAuth consent screen' in left menu"
echo "   - User Type: External"
echo "   - App name: Atoms Ninja"
echo "   - User support email: your-email@gmail.com"
echo "   - Developer contact: your-email@gmail.com"
echo "   - Scopes: Add 'userinfo.email' and 'userinfo.profile'"
echo "   - Test users: Add your email"
echo ""
echo "3. Create OAuth Client ID:"
echo "   - Click 'Create Credentials' > 'OAuth client ID'"
echo "   - Application type: Web application"
echo "   - Name: Atoms Ninja Web Client"
echo "   - Authorized redirect URIs:"
echo "     * $REDIRECT_URI"
echo "     * $FRONTEND_URL/auth/callback"
echo "     * http://localhost:3002/auth/google/callback"
echo ""
echo "4. Copy the Client ID and Client Secret"
echo ""
echo "5. Update .env file:"
echo "   GOOGLE_CLIENT_ID=your-client-id"
echo "   GOOGLE_CLIENT_SECRET=your-client-secret"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick link:"
echo "https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
