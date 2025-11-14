#!/bin/bash
# Atoms.Ninja - Complete Integrated Deployment
# AI-Driven Hacking + Metasploit + Full Platform

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🥷 ATOMS.NINJA - INTEGRATED DEPLOYMENT                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Deploying: AI-Driven Hacking + Metasploit Automation"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_feature() { echo -e "${PURPLE}[★]${NC} $1"; }

# Step 1: Deploy Metasploit Server
log_info "Deploying Metasploit server to GCP..."
./gcp-metasploit-deploy.sh

# Get server IP
MSF_IP=$(cat /tmp/metasploit-gcp-config.txt 2>/dev/null | grep EXTERNAL_IP | cut -d= -f2)

# Step 2: Update config
log_info "Updating configuration..."
cat > config.js << EOF
const appConfig = {
    BACKEND_API_URL: 'https://www.atoms.ninja/api',
    AI_ENDPOINT: 'https://www.atoms.ninja/api/multi-ai',
    KALI_MCP_ENDPOINT: 'http://${MSF_IP}:3001',
    MSF_API: 'http://${MSF_IP}:3001',
    AI_MODE: 'fast'
};
if (typeof window !== 'undefined') window.appConfig = appConfig;
if (typeof module !== 'undefined') module.exports = appConfig;
EOF

log_success "Configuration updated"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ ATOMS.NINJA DEPLOYED                                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
log_feature "AI-Driven Hacking - Natural language to exploits"
log_feature "Metasploit Integration - Easy & Advanced modes"  
log_feature "500+ Security Tools - Full Kali arsenal"
log_feature "Session Management - Track all operations"
echo ""
echo "🌐 Platform: https://www.atoms.ninja"
echo "💣 Metasploit: http://${MSF_IP}:3001"
echo ""
echo "Test AI: 'scan example.com'"
echo "Test MSF: Visit /metasploit-easy.html"
echo ""
log_success "Ready for action, Chief! 🥷"
