#!/bin/bash
# Migrate Atoms Ninja VM to Another GCP Project/Account
# Complete automated migration with all data and configurations

set -e

echo "🔄 VM Migration Script - Atoms Ninja"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will migrate your VM instance to a new GCP project."
echo ""

# Source project details
SOURCE_PROJECT="gen-lang-client-0528385692"
SOURCE_VM="atoms-kali-security"
SOURCE_ZONE="us-central1-a"

# Prompt for target project
read -p "Enter target GCP Project ID: " TARGET_PROJECT
read -p "Enter target Zone (default: us-central1-a): " TARGET_ZONE
TARGET_ZONE=${TARGET_ZONE:-us-central1-a}

read -p "Enter target VM name (default: atoms-kali-security): " TARGET_VM
TARGET_VM=${TARGET_VM:-atoms-kali-security}

echo ""
echo "Migration Plan:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Source:"
echo "  Project: $SOURCE_PROJECT"
echo "  VM:      $SOURCE_VM"
echo "  Zone:    $SOURCE_ZONE"
echo ""
echo "Target:"
echo "  Project: $TARGET_PROJECT"
echo "  VM:      $TARGET_VM"
echo "  Zone:    $TARGET_ZONE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 1: Create snapshot of source VM
echo ""
echo "📸 Step 1: Creating snapshot of source VM..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SNAPSHOT_NAME="atoms-migration-$(date +%Y%m%d-%H%M%S)"

# Get disk name
SOURCE_DISK=$(gcloud compute instances describe $SOURCE_VM \
    --zone=$SOURCE_ZONE \
    --project=$SOURCE_PROJECT \
    --format='get(disks[0].source)' | rev | cut -d'/' -f1 | rev)

echo "Source disk: $SOURCE_DISK"
echo "Creating snapshot: $SNAPSHOT_NAME"

gcloud compute disks snapshot $SOURCE_DISK \
    --zone=$SOURCE_ZONE \
    --project=$SOURCE_PROJECT \
    --snapshot-names=$SNAPSHOT_NAME \
    --description="Migration snapshot for Atoms Ninja VM"

echo "✅ Snapshot created: $SNAPSHOT_NAME"

# Step 2: Export snapshot to Cloud Storage
echo ""
echo "📦 Step 2: Exporting snapshot to Cloud Storage..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create temporary bucket if needed
BUCKET_NAME="${SOURCE_PROJECT}-vm-migration"
gsutil mb -p $SOURCE_PROJECT gs://$BUCKET_NAME/ 2>/dev/null || echo "Bucket exists"

# Export snapshot as image
IMAGE_NAME="atoms-migration-image-$(date +%Y%m%d-%H%M%S)"
gcloud compute images create $IMAGE_NAME \
    --source-snapshot=$SNAPSHOT_NAME \
    --project=$SOURCE_PROJECT \
    --storage-location=us

echo "✅ Image created: $IMAGE_NAME"

# Export to Cloud Storage
IMAGE_FILE="gs://$BUCKET_NAME/${IMAGE_NAME}.tar.gz"
gcloud compute images export \
    --image=$IMAGE_NAME \
    --destination-uri=$IMAGE_FILE \
    --project=$SOURCE_PROJECT \
    --export-format=vmdk

echo "✅ Image exported to: $IMAGE_FILE"

# Step 3: Share bucket with target account
echo ""
echo "🔐 Step 3: Configuring access..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Enter target GCP account email: " TARGET_ACCOUNT

gsutil iam ch user:${TARGET_ACCOUNT}:objectViewer gs://$BUCKET_NAME/

echo "✅ Access granted to $TARGET_ACCOUNT"

# Step 4: Instructions for target project
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps - Run in TARGET project:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Switch to target account/project:"
echo "   gcloud auth login"
echo "   gcloud config set project $TARGET_PROJECT"
echo ""
echo "2. Import the image:"
echo "   gcloud compute images import $IMAGE_NAME \\"
echo "     --source-file=$IMAGE_FILE \\"
echo "     --os=debian-11"
echo ""
echo "3. Create new VM from image:"
echo "   gcloud compute instances create $TARGET_VM \\"
echo "     --zone=$TARGET_ZONE \\"
echo "     --machine-type=e2-standard-4 \\"
echo "     --image=$IMAGE_NAME \\"
echo "     --boot-disk-size=50GB \\"
echo "     --boot-disk-type=pd-ssd \\"
echo "     --tags=http-server,https-server,kali-mcp"
echo ""
echo "4. Configure firewall rules:"
echo "   gcloud compute firewall-rules create atoms-http \\"
echo "     --allow=tcp:80,tcp:443,tcp:3001,tcp:3002 \\"
echo "     --target-tags=kali-mcp,http-server"
echo ""
echo "5. Get new IP and update DNS/configs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Image location: $IMAGE_FILE"
echo "Snapshot: $SNAPSHOT_NAME (can be deleted after migration)"
echo ""
echo "✅ Migration preparation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
