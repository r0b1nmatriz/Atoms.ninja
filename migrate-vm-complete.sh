#!/bin/bash
# Complete Cross-Account VM Migration for Atoms Ninja
# This script handles EVERYTHING automatically

set -e

echo "🚀 Automated Cross-Account VM Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Source configuration
SOURCE_PROJECT="gen-lang-client-0528385692"
SOURCE_VM="atoms-kali-security"
SOURCE_ZONE="us-central1-a"

# Get target configuration
echo "Enter target project details:"
read -p "Target GCP Project ID: " TARGET_PROJECT
read -p "Target GCP Account Email: " TARGET_ACCOUNT
read -p "Target Zone (default: us-central1-a): " TARGET_ZONE
TARGET_ZONE=${TARGET_ZONE:-us-central1-a}
TARGET_VM="atoms-kali-security"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migration Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FROM: $SOURCE_PROJECT → TO: $TARGET_PROJECT"
echo "VM:   $SOURCE_VM → $TARGET_VM"
echo "Zone: $SOURCE_ZONE → $TARGET_ZONE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Continue? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 0

# Timestamps for unique naming
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_NAME="atoms-snap-${TIMESTAMP}"
IMAGE_NAME="atoms-image-${TIMESTAMP}"
BUCKET_NAME="${SOURCE_PROJECT}-migration"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 1: Creating Disk Snapshot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get VM disk
SOURCE_DISK=$(gcloud compute instances describe $SOURCE_VM \
    --zone=$SOURCE_ZONE \
    --project=$SOURCE_PROJECT \
    --format='get(disks[0].source)' | rev | cut -d'/' -f1 | rev)

echo "📀 Source disk: $SOURCE_DISK"
echo "📸 Creating snapshot: $SNAPSHOT_NAME"

gcloud compute disks snapshot $SOURCE_DISK \
    --zone=$SOURCE_ZONE \
    --project=$SOURCE_PROJECT \
    --snapshot-names=$SNAPSHOT_NAME \
    --description="Atoms Ninja migration to $TARGET_PROJECT"

echo "✅ Snapshot created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 2: Creating Machine Image"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create image from snapshot
gcloud compute images create $IMAGE_NAME \
    --source-snapshot=$SNAPSHOT_NAME \
    --project=$SOURCE_PROJECT \
    --storage-location=us \
    --description="Atoms Ninja VM for migration"

echo "✅ Image created: $IMAGE_NAME"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PHASE 3: Setting Up Cross-Project Access"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Grant image access to target project
gcloud compute images add-iam-policy-binding $IMAGE_NAME \
    --project=$SOURCE_PROJECT \
    --member="user:${TARGET_ACCOUNT}" \
    --role="roles/compute.imageUser"

echo "✅ Image access granted to $TARGET_ACCOUNT"

# Create instructions file
cat > /tmp/migration-commands.sh << EOF
#!/bin/bash
# Run these commands in the TARGET project

echo "🔄 Importing VM to $TARGET_PROJECT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set project
gcloud config set project $TARGET_PROJECT

# Create VM from shared image
echo "Creating VM instance..."
gcloud compute instances create $TARGET_VM \\
    --zone=$TARGET_ZONE \\
    --machine-type=e2-standard-4 \\
    --image-project=$SOURCE_PROJECT \\
    --image=$IMAGE_NAME \\
    --boot-disk-size=50GB \\
    --boot-disk-type=pd-ssd \\
    --tags=http-server,https-server,kali-mcp \\
    --metadata=startup-script='#!/bin/bash
    systemctl restart atoms-backend
    systemctl restart kali-mcp
    '

echo "✅ VM created: $TARGET_VM"

# Create firewall rules
echo "Configuring firewall..."
gcloud compute firewall-rules create atoms-http-access \\
    --allow=tcp:80,tcp:443,tcp:3001,tcp:3002,tcp:22 \\
    --target-tags=kali-mcp,http-server,https-server \\
    --description="Atoms Ninja access"

echo "✅ Firewall configured"

# Get new IP
NEW_IP=\$(gcloud compute instances describe $TARGET_VM \\
    --zone=$TARGET_ZONE \\
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "New VM IP: \$NEW_IP"
echo ""
echo "Update your configurations:"
echo "  Backend: http://\$NEW_IP:3002"
echo "  Kali MCP: http://\$NEW_IP:3001"
echo ""
echo "Test services:"
echo "  curl http://\$NEW_IP:3002/health"
echo "  curl http://\$NEW_IP:3001/health"
echo ""
EOF

chmod +x /tmp/migration-commands.sh

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SOURCE PROJECT PREPARATION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Switch to target account:"
echo "   gcloud auth login"
echo "   gcloud auth application-default login"
echo ""
echo "2. Run migration script in target project:"
echo "   bash /tmp/migration-commands.sh"
echo ""
echo "Or manually create VM:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "gcloud config set project $TARGET_PROJECT"
echo ""
echo "gcloud compute instances create $TARGET_VM \\"
echo "  --zone=$TARGET_ZONE \\"
echo "  --machine-type=e2-standard-4 \\"
echo "  --image-project=$SOURCE_PROJECT \\"
echo "  --image=$IMAGE_NAME \\"
echo "  --boot-disk-size=50GB \\"
echo "  --tags=http-server,https-server,kali-mcp"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Image: projects/$SOURCE_PROJECT/global/images/$IMAGE_NAME"
echo "Snapshot: $SNAPSHOT_NAME"
echo ""
echo "Migration commands saved to: /tmp/migration-commands.sh"
echo ""
