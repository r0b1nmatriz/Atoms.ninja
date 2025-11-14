# 🔄 VM Migration Guide - Cross-Account Transfer

**Purpose:** Migrate Atoms Ninja VM to a new GCP project/account  
**Time Required:** 30-45 minutes  
**Downtime:** 10-15 minutes

---

## 📋 Prerequisites

### **Source Account (Current):**
- Project: `gen-lang-client-0528385692`
- VM: `atoms-kali-security`
- Zone: `us-central1-a`
- Access: Admin/Owner permissions

### **Target Account (New):**
- New GCP project created
- Billing enabled
- Compute Engine API enabled
- Your email has Owner role

---

## 🚀 Quick Migration (Automated)

### **Option 1: Fully Automated Script**

```bash
cd /Users/admin/atoms
./migrate-vm-complete.sh
```

This script will:
1. ✅ Create snapshot of current VM
2. ✅ Create machine image
3. ✅ Grant access to target account
4. ✅ Provide exact commands for target project

---

## 📝 Manual Migration (Step-by-Step)

### **PHASE 1: Prepare Source VM** (5 minutes)

#### **1.1 Create Snapshot**

```bash
# Set source project
gcloud config set project gen-lang-client-0528385692

# Create snapshot
gcloud compute disks snapshot atoms-kali-security \
  --zone=us-central1-a \
  --snapshot-names=atoms-migration-$(date +%Y%m%d) \
  --description="Atoms Ninja migration snapshot"
```

#### **1.2 Create Machine Image**

```bash
# Create image from VM
gcloud compute images create atoms-migration-image \
  --source-disk=atoms-kali-security \
  --source-disk-zone=us-central1-a \
  --storage-location=us \
  --description="Atoms Ninja complete VM image"
```

**OR** create from snapshot:

```bash
gcloud compute images create atoms-migration-image \
  --source-snapshot=atoms-migration-$(date +%Y%m%d) \
  --storage-location=us
```

#### **1.3 Grant Access to Target Account**

```bash
# Replace with your target account email
TARGET_EMAIL="your-target-account@gmail.com"

gcloud compute images add-iam-policy-binding atoms-migration-image \
  --member="user:${TARGET_EMAIL}" \
  --role="roles/compute.imageUser"
```

---

### **PHASE 2: Import to Target Project** (10 minutes)

#### **2.1 Switch to Target Account**

```bash
# Login to target account
gcloud auth login

# Set target project
gcloud config set project YOUR-TARGET-PROJECT-ID

# Verify
gcloud config list
```

#### **2.2 Create VM from Image**

```bash
# Create new VM in target project
gcloud compute instances create atoms-kali-security \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-project=gen-lang-client-0528385692 \
  --image=atoms-migration-image \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server,kali-mcp \
  --metadata=startup-script='#!/bin/bash
systemctl restart atoms-backend
systemctl restart kali-mcp
'
```

#### **2.3 Configure Firewall**

```bash
# Create firewall rules
gcloud compute firewall-rules create atoms-http \
  --allow=tcp:80,tcp:443,tcp:3001,tcp:3002 \
  --target-tags=kali-mcp,http-server

gcloud compute firewall-rules create atoms-ssh \
  --allow=tcp:22 \
  --target-tags=http-server
```

#### **2.4 Get New IP Address**

```bash
# Get new external IP
gcloud compute instances describe atoms-kali-security \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

---

### **PHASE 3: Update Configurations** (10 minutes)

#### **3.1 Update Backend Configuration**

```bash
# SSH into new VM
gcloud compute ssh atoms-kali-security --zone=us-central1-a

# Get new IP
NEW_IP=$(curl -s ifconfig.me)
echo "New IP: $NEW_IP"

# Update .env if needed
sudo nano /opt/atoms-backend/.env

# Restart services
sudo systemctl restart atoms-backend
sudo systemctl restart kali-mcp
```

#### **3.2 Verify Services**

```bash
# Test backend
curl http://localhost:3002/health

# Test Kali MCP
curl http://localhost:3001/health

# Exit SSH
exit
```

#### **3.3 Test from External**

```bash
# Replace with your new IP
NEW_IP="YOUR_NEW_IP"

curl http://$NEW_IP:3002/health
curl http://$NEW_IP:3001/health
```

---

### **PHASE 4: Update Application** (5 minutes)

#### **4.1 Update Frontend Configuration**

Update `config.js` and `script.js`:

```javascript
const CONFIG = {
    BACKEND_API_URL: 'http://YOUR_NEW_IP:3002',
    KALI_MCP_ENDPOINT: 'http://YOUR_NEW_IP:3001',
    AI_ENDPOINT: 'http://YOUR_NEW_IP:3002/api/multi-ai'
};
```

#### **4.2 Update OAuth Redirect URI**

Go to Google Cloud Console:
1. Visit: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth Client ID
3. Add new redirect URI: `http://YOUR_NEW_IP:3002/auth/google/callback`
4. Keep old URI for now (until migration verified)

#### **4.3 Update DNS (if applicable)**

If using custom domain:
- Update A record to point to new IP
- Wait for DNS propagation (5-30 minutes)

---

## 🧪 Testing Checklist

After migration, verify:

```bash
NEW_IP="YOUR_NEW_IP"

# 1. Backend health
curl http://$NEW_IP:3002/health
# Expected: {"status":"ok","auth":{"enabled":true}}

# 2. Kali MCP health
curl http://$NEW_IP:3001/health
# Expected: {"status":"ok","service":"kali-mcp-server"}

# 3. AI endpoint (should require auth)
curl -X POST http://$NEW_IP:3002/api/multi-ai \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: {"error":"Authentication required"}

# 4. OAuth status
curl http://$NEW_IP:3002/auth/status
# Expected: {"authenticated":false,"user":null}

# 5. SSH access
gcloud compute ssh atoms-kali-security --zone=us-central1-a
# Should connect successfully
```

---

## 🔍 Troubleshooting

### **VM Won't Start**

```bash
# Check VM status
gcloud compute instances describe atoms-kali-security \
  --zone=us-central1-a \
  --format='get(status)'

# Check serial port output
gcloud compute instances get-serial-port-output atoms-kali-security \
  --zone=us-central1-a
```

### **Services Not Running**

```bash
# SSH into VM
gcloud compute ssh atoms-kali-security --zone=us-central1-a

# Check backend
sudo systemctl status atoms-backend
sudo journalctl -u atoms-backend -n 50

# Check Kali MCP
sudo systemctl status kali-mcp
sudo journalctl -u kali-mcp -n 50

# Restart if needed
sudo systemctl restart atoms-backend
sudo systemctl restart kali-mcp
```

### **Firewall Issues**

```bash
# List firewall rules
gcloud compute firewall-rules list

# Test connectivity
nc -zv YOUR_NEW_IP 3002
nc -zv YOUR_NEW_IP 3001
```

### **Can't Access Image from Target Project**

```bash
# Verify IAM permissions
gcloud compute images get-iam-policy atoms-migration-image \
  --project=gen-lang-client-0528385692

# Re-grant access
gcloud compute images add-iam-policy-binding atoms-migration-image \
  --project=gen-lang-client-0528385692 \
  --member="user:target-account@gmail.com" \
  --role="roles/compute.imageUser"
```

---

## 🔄 Alternative: Using Cloud Storage

If direct image sharing doesn't work:

### **1. Export to Cloud Storage**

```bash
# In source project
gsutil mb -p gen-lang-client-0528385692 gs://atoms-migration-bucket/

gcloud compute images export \
  --image=atoms-migration-image \
  --destination-uri=gs://atoms-migration-bucket/atoms-vm-image.vmdk \
  --export-format=vmdk \
  --project=gen-lang-client-0528385692
```

### **2. Grant Bucket Access**

```bash
gsutil iam ch user:target-account@gmail.com:objectViewer \
  gs://atoms-migration-bucket
```

### **3. Import in Target Project**

```bash
# In target project
gcloud compute images import atoms-kali-image \
  --source-file=gs://atoms-migration-bucket/atoms-vm-image.vmdk \
  --os=debian-11 \
  --project=YOUR-TARGET-PROJECT
```

---

## 🧹 Cleanup (After Verification)

Once migration is successful and verified:

### **In Source Project:**

```bash
# Delete snapshot (optional, after verification)
gcloud compute snapshots delete atoms-migration-YYYYMMDD \
  --project=gen-lang-client-0528385692

# Delete migration image (optional)
gcloud compute images delete atoms-migration-image \
  --project=gen-lang-client-0528385692

# Stop/delete old VM (after full verification)
gcloud compute instances stop atoms-kali-security \
  --zone=us-central1-a \
  --project=gen-lang-client-0528385692
```

---

## 📊 Cost Comparison

### **Storage Costs During Migration:**
- Snapshot: ~$0.026/GB/month
- Image: ~$0.08/GB/month
- Cloud Storage export: ~$0.02/GB/month

### **VM Costs:**
- e2-standard-4: ~$120/month (same in both projects)
- Network egress: Free within same region

---

## 🎯 Quick Commands Reference

```bash
# Create snapshot
gcloud compute disks snapshot DISK --zone=ZONE --snapshot-names=NAME

# Create image from snapshot
gcloud compute images create IMAGE --source-snapshot=SNAPSHOT

# Grant image access
gcloud compute images add-iam-policy-binding IMAGE \
  --member="user:EMAIL" --role="roles/compute.imageUser"

# Create VM from image (different project)
gcloud compute instances create VM \
  --image-project=SOURCE-PROJECT --image=IMAGE

# Get VM IP
gcloud compute instances describe VM --zone=ZONE \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

---

## ✅ Migration Checklist

- [ ] Create snapshot in source project
- [ ] Create machine image
- [ ] Grant access to target account
- [ ] Switch to target account/project
- [ ] Create VM from shared image
- [ ] Configure firewall rules
- [ ] Verify services are running
- [ ] Get new IP address
- [ ] Update frontend configuration
- [ ] Update OAuth redirect URIs
- [ ] Test all endpoints
- [ ] Update DNS (if applicable)
- [ ] Verify for 24-48 hours
- [ ] Cleanup old resources

---

## 🆘 Support

**Migration scripts:**
- `migrate-vm-complete.sh` - Fully automated
- `migrate-vm.sh` - Interactive with guidance

**Documentation:**
- This file: Complete step-by-step guide
- Google Cloud: https://cloud.google.com/compute/docs/images/importing-virtual-disks

---

**Ready to migrate?** Run `./migrate-vm-complete.sh` to start! 🚀
