#!/bin/bash
# Quick status checker for GCP Metasploit server

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 GCP Metasploit Server Status Checker${NC}"
echo "=========================================="
echo ""

# Load config if exists
if [ -f /tmp/metasploit-gcp-config.txt ]; then
    source /tmp/metasploit-gcp-config.txt
    echo -e "${GREEN}✓${NC} Configuration loaded"
else
    echo -e "${RED}✗${NC} No configuration found. Have you deployed yet?"
    echo "   Run: ./gcp-metasploit-deploy.sh"
    exit 1
fi

echo ""
echo "📋 Server Information:"
echo "   Instance: $INSTANCE_NAME"
echo "   Zone: $GCP_ZONE"
echo "   IP: $EXTERNAL_IP"
echo "   API: $API_ENDPOINT"
echo ""

# Check if instance is running
echo -e "${BLUE}Checking instance status...${NC}"
STATUS=$(gcloud compute instances describe $INSTANCE_NAME --zone=$GCP_ZONE --format='get(status)' 2>/dev/null || echo "NOT_FOUND")

if [ "$STATUS" == "RUNNING" ]; then
    echo -e "${GREEN}✓${NC} Instance is RUNNING"
elif [ "$STATUS" == "TERMINATED" ]; then
    echo -e "${YELLOW}⚠${NC}  Instance is STOPPED"
    read -p "   Start it now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud compute instances start $INSTANCE_NAME --zone=$GCP_ZONE
        echo "   Waiting for startup..."
        sleep 30
    else
        exit 0
    fi
else
    echo -e "${RED}✗${NC} Instance not found or error: $STATUS"
    exit 1
fi

# Check API health
echo ""
echo -e "${BLUE}Checking API health...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" $API_ENDPOINT/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓${NC} API is healthy"
    echo "   Response: $HEALTH_BODY"
else
    echo -e "${RED}✗${NC} API not responding (HTTP $HTTP_CODE)"
    echo "   This is normal if the instance just started. Wait ~5 minutes."
    echo "   Manual check: curl $API_ENDPOINT/health"
fi

# Check active listeners
echo ""
echo -e "${BLUE}Checking active listeners...${NC}"
LISTENERS=$(curl -s $API_ENDPOINT/api/listener/list 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$LISTENERS" | jq -r '.listeners[] | "   - Job \(.jobId): \(.platform) on \(.lhost):\(.lport) [\(.status)]"' 2>/dev/null || echo "   No active listeners"
else
    echo -e "${YELLOW}⚠${NC}  Could not retrieve listener status"
fi

# Quick actions
echo ""
echo "🚀 Quick Actions:"
echo ""
echo "   SSH into server:"
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$GCP_ZONE"
echo ""
echo "   View API logs:"
echo "   gcloud compute ssh $INSTANCE_NAME --zone=$GCP_ZONE --command='journalctl -u metasploit-api -f'"
echo ""
echo "   Generate payload:"
echo "   curl -X POST $API_ENDPOINT/api/quick-setup \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"platform\":\"windows\",\"lhost\":\"$EXTERNAL_IP\",\"lport\":4444,\"encode\":true}' | jq '.'"
echo ""
echo "   Stop instance:"
echo "   gcloud compute instances stop $INSTANCE_NAME --zone=$GCP_ZONE"
echo ""
echo "   Delete everything:"
echo "   gcloud compute instances delete $INSTANCE_NAME --zone=$GCP_ZONE --quiet"
echo ""
