#!/bin/bash
set -e

echo "🚀 Complete Deployment Script for Atoms Ninja"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Deploy Backend to Vercel
echo -e "${BLUE}Step 1: Deploying Backend to Vercel${NC}"
echo "-----------------------------------"
cd /Users/admin/atoms
vercel --prod --yes
echo ""

# Step 2: Deploy Frontend to Vercel
echo -e "${BLUE}Step 2: Deploying Frontend to Vercel${NC}"
echo "------------------------------------"
cd /Users/admin/atoms/frontend
vercel --prod --yes
echo ""

# Step 3: Deploy Kali MCP to GCP (optional)
echo -e "${BLUE}Step 3: Deploy Kali MCP Server (optional)${NC}"
echo "-------------------------------------------"
read -p "Deploy Kali MCP to GCP? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd /Users/admin/atoms
    bash deploy-mcp.sh
fi

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "======================="
echo ""
echo "📋 Deployment Summary:"
echo "  Backend:  https://atoms-ninja-backend.vercel.app"
echo "  Frontend: https://atoms-ninja-frontend.vercel.app"
echo "  Kali MCP: http://136.113.58.241:3001"
echo ""
echo "⚙️  Next Steps:"
echo "  1. Verify all endpoints are working"
echo "  2. Test Gemini API integration"
echo "  3. Test Kali MCP tools"
echo "  4. Set up monitoring and alerts"
