// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Configuration - Always use www.atoms.ninja
const CONFIG = {
    GEMINI_API_KEY: '', // Not needed - using backend proxy
    BACKEND_API_URL: 'https://www.atoms.ninja/api',
    KALI_MCP_ENDPOINT: 'https://www.atoms.ninja/api/kali',
    AI_ENDPOINT: 'https://www.atoms.ninja/api/multi-ai', // Multi-AI with fallback
    AI_HEALTH_ENDPOINT: 'https://www.atoms.ninja/api/ai-health',
    AI_MODE: 'fast' // fast | accurate | stealth
};

// Enhanced Session Manager with persistence
class SessionManager {
    constructor() {
        this.sessions = this.loadSessions();
        this.currentSession = this.loadCurrentSession();
    }
    
    loadSessions() {
        try {
            const saved = localStorage.getItem('atom_sessions');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }
    
    saveSessions() {
        localStorage.setItem('atom_sessions', JSON.stringify(this.sessions));
    }
    
    loadCurrentSession() {
        try {
            const saved = localStorage.getItem('atom_current_session');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        
        const newSession = {
            id: Date.now(),
            name: `Session ${new Date().toLocaleString()}`,
            created: new Date().toISOString(),
            targets: [],
            scans: [],
            vulnerabilities: [],
            riskScore: 0
        };
        this.saveCurrentSession(newSession);
        return newSession;
    }
    
    saveCurrentSession(session = this.currentSession) {
        localStorage.setItem('atom_current_session', JSON.stringify(session));
    }
    
    addScan(command, output, vulnerabilities = []) {
        this.currentSession.scans.push({
            timestamp: new Date().toISOString(),
            command,
            output,
            vulnerabilities
        });
        
        if (vulnerabilities.length > 0) {
            this.currentSession.vulnerabilities.push(...vulnerabilities);
            this.updateRiskScore();
        }
        
        this.saveCurrentSession();
    }
    
    addTarget(target) {
        if (!this.currentSession.targets.includes(target)) {
            this.currentSession.targets.push(target);
            this.saveCurrentSession();
        }
    }
    
    updateRiskScore() {
        let score = 0;
        for (const vuln of this.currentSession.vulnerabilities) {
            if (vuln.severity === 'CRITICAL') score += 10;
            else if (vuln.severity === 'HIGH') score += 7;
            else if (vuln.severity === 'MEDIUM') score += 4;
            else if (vuln.severity === 'LOW') score += 2;
        }
        this.currentSession.riskScore = Math.min(100, score);
    }
    
    exportReport() {
        const report = {
            session: this.currentSession,
            exported: new Date().toISOString(),
            summary: {
                totalScans: this.currentSession.scans.length,
                totalTargets: this.currentSession.targets.length,
                totalVulnerabilities: this.currentSession.vulnerabilities.length,
                riskScore: this.currentSession.riskScore,
                criticalVulns: this.currentSession.vulnerabilities.filter(v => v.severity === 'CRITICAL').length
            }
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `atom-report-${Date.now()}.json`;
        a.click();
        
        addTerminalLine(`📄 Report exported: ${a.download}`, 'success');
    }
}

const atomSession = new SessionManager();

// Terminal functionality - initialized after DOM loads
let commandInput;
let executeBtn;
let terminalOutput;
let launchBtn;
let docsBtn;

window.window.isExecuting = false;
let commandHistory = [];
let historyIndex = -1;

// Advanced AI Memory System
let chatHistory = [];
const MAX_CHAT_HISTORY = 20; // Increased from 10
let currentSession = {
    id: Date.now(),
    startTime: new Date().toISOString(),
    targets: new Set(),
    findings: [],
    toolsUsed: new Set(),
    vulnerabilities: [],
    recommendations: []
};

// Session Management
function startNewSession() {
    currentSession = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        targets: new Set(),
        findings: [],
        toolsUsed: new Set(),
        vulnerabilities: [],
        recommendations: []
    };
    localStorage.setItem('atomsNinjaCurrentSession', JSON.stringify(currentSession, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
    }));
}

// Load current session
function loadCurrentSession() {
    const saved = localStorage.getItem('atomsNinjaCurrentSession');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            currentSession = {
                ...data,
                targets: new Set(data.targets),
                toolsUsed: new Set(data.toolsUsed)
            };
        } catch (e) {
            console.error('Failed to load session:', e);
        }
    }
}

// Extract and track targets from commands
function trackTarget(command) {
    // Extract IPs, domains, and URLs
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const domainPattern = /\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}\b/gi;
    const urlPattern = /https?:\/\/[^\s]+/gi;
    
    const ips = command.match(ipPattern) || [];
    const domains = command.match(domainPattern) || [];
    const urls = command.match(urlPattern) || [];
    
    [...ips, ...domains, ...urls].forEach(target => {
        currentSession.targets.add(target);
    });
    
    saveSession();
}

// Save finding from scan results
function saveFinding(tool, target, result) {
    const finding = {
        timestamp: new Date().toISOString(),
        tool: tool,
        target: target,
        result: result.substring(0, 500), // Store first 500 chars
        hash: btoa(tool + target + Date.now()) // Unique ID
    };
    
    currentSession.findings.push(finding);
    currentSession.toolsUsed.add(tool);
    
    // Auto-detect vulnerabilities
    detectVulnerabilities(result);
    
    saveSession();
}

// Detect vulnerabilities from scan results
function detectVulnerabilities(result) {
    const vulnPatterns = [
        { pattern: /SQL injection/i, type: 'SQL Injection', severity: 'high' },
        { pattern: /XSS|Cross-Site Scripting/i, type: 'XSS', severity: 'high' },
        { pattern: /open port|port.*open/i, type: 'Open Port', severity: 'medium' },
        { pattern: /vulnerable|exploitable/i, type: 'Potential Vulnerability', severity: 'medium' },
        { pattern: /weak|default password/i, type: 'Weak Credentials', severity: 'high' },
        { pattern: /outdated|old version/i, type: 'Outdated Software', severity: 'medium' }
    ];
    
    vulnPatterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(result)) {
            currentSession.vulnerabilities.push({
                type: type,
                severity: severity,
                timestamp: new Date().toISOString(),
                details: result.substring(0, 200)
            });
        }
    });
}

// Save session
function saveSession() {
    localStorage.setItem('atomsNinjaCurrentSession', JSON.stringify(currentSession, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
    }));
}

// Generate session summary
function getSessionSummary() {
    return `
SESSION INTELLIGENCE:
• Targets Scanned: ${currentSession.targets.size} (${Array.from(currentSession.targets).join(', ')})
• Tools Used: ${Array.from(currentSession.toolsUsed).join(', ')}
• Findings: ${currentSession.findings.length} total
• Vulnerabilities Found: ${currentSession.vulnerabilities.length}
• Session Duration: ${Math.round((Date.now() - currentSession.id) / 1000 / 60)} minutes
`;
}

// Enhanced chat interaction saving
function saveChatInteraction(userInput, aiResponse, commandExecuted = null, scanResult = null) {
    const interaction = {
        timestamp: new Date().toISOString(),
        user: userInput,
        ai: aiResponse,
        command: commandExecuted,
        scanResult: scanResult ? scanResult.substring(0, 300) : null
    };
    
    chatHistory.push(interaction);
    
    // Track targets from command
    if (commandExecuted) {
        trackTarget(commandExecuted);
        
        // Extract tool name
        const tool = commandExecuted.split(' ')[0];
        if (scanResult) {
            saveFinding(tool, 'extracted-target', scanResult);
        }
    }
    
    // Keep only last MAX_CHAT_HISTORY interactions
    if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
    }
    
    // Save to localStorage
    localStorage.setItem('atomsNinjaChatHistory', JSON.stringify(chatHistory));
}

// Load chat history from localStorage
function loadChatHistory() {
    const saved = localStorage.getItem('atomsNinjaChatHistory');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load chat history:', e);
            chatHistory = [];
        }
    }
}

// Advanced context with session intelligence
function getChatContext() {
    if (chatHistory.length === 0) return '';
    
    // Recent conversation
    const recentContext = chatHistory.slice(-5).map(interaction => {
        let ctx = `User: ${interaction.user}\nAI: ${interaction.ai.substring(0, 200)}`;
        if (interaction.command) {
            ctx += `\nExecuted: ${interaction.command}`;
        }
        if (interaction.scanResult) {
            ctx += `\nResult: ${interaction.scanResult.substring(0, 100)}...`;
        }
        return ctx;
    }).join('\n---\n');
    
    // Session intelligence
    const sessionIntel = getSessionSummary();
    
    return `
RECENT CONVERSATION HISTORY:
${recentContext}

${sessionIntel}

INSTRUCTIONS:
- Use conversation history to maintain context
- Reference previous scans and findings
- Suggest next logical steps based on what's been done
- If user asks "what did we find?", summarize session findings
- If vulnerabilities detected, prioritize mentioning them
- Track the progression: Recon → Enumeration → Exploitation → Post-Exploitation
`;
}

// Add terminal line
function addTerminalLine(text, type = 'text') {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    
    // Military-style prompts
    if (type === 'mission' || text.includes('Chief') || text.includes('Sir')) {
        prompt.textContent = '[ATOM]';
        prompt.style.color = '#00ff00';
    } else {
        prompt.textContent = 'atom@ninja:~#';
    }
    
    const textSpan = document.createElement('span');
    textSpan.className = `terminal-${type}`;
    
    // Handle long output - show full results with scrolling
    if (text.length > 500) {
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
            const lineSpan = document.createElement('div');
            lineSpan.innerHTML = formatMilitaryText(line);
            lineSpan.style.whiteSpace = 'pre-wrap';
            lineSpan.style.wordBreak = 'break-word';
            textSpan.appendChild(lineSpan);
        });
    } else {
        // Format military-style text
        textSpan.innerHTML = formatMilitaryText(text);
    }
    textSpan.style.whiteSpace = 'pre-wrap';
    textSpan.style.wordBreak = 'break-word';
    
    line.appendChild(prompt);
    line.appendChild(textSpan);
    
    // Remove cursor before adding new line
    const cursor = terminalOutput.querySelector('.terminal-cursor');
    if (cursor) cursor.remove();
    
    terminalOutput.appendChild(line);
    
    // Add cursor back
    const newCursor = document.createElement('div');
    newCursor.className = 'terminal-cursor';
    newCursor.textContent = '_';
    terminalOutput.appendChild(newCursor);
    
    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Format military-style text with emphasis
function formatMilitaryText(text) {
    // Convert text to string if it isn't already
    const str = String(text);
    
    return str
        .replace(/(Chief|Sir|Roger|Affirmative|Copy|Target acquired)/gi, '<strong style="color: #00ff00;">$1</strong>')
        .replace(/(ERROR|FAILED|CRITICAL)/gi, '<strong style="color: #ff0000;">$1</strong>')
        .replace(/(SUCCESS|COMPLETE|FOUND)/gi, '<strong style="color: #00ff41;">$1</strong>');
}

// Add animated progress indicator
function addProgressIndicator() {
    const line = document.createElement('div');
    line.className = 'terminal-line terminal-progress';
    line.id = 'progress-indicator';
    
    const spinner = document.createElement('span');
    spinner.className = 'progress-spinner';
    
    const text = document.createElement('span');
    text.textContent = 'Scanning in progress';
    text.style.color = 'var(--color-neon-bright)';
    
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    progressBarContainer.appendChild(progressBar);
    
    line.appendChild(spinner);
    line.appendChild(text);
    line.appendChild(progressBarContainer);
    
    // Remove cursor before adding progress
    const cursor = terminalOutput.querySelector('.terminal-cursor');
    if (cursor) cursor.remove();
    
    terminalOutput.appendChild(line);
    
    // Add cursor back
    const newCursor = document.createElement('div');
    newCursor.className = 'terminal-cursor';
    newCursor.textContent = '_';
    terminalOutput.appendChild(newCursor);
    
    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Remove progress indicator
function removeProgressIndicator() {
    const indicator = document.getElementById('progress-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Simulate command execution - make globally accessible
window.executeCommand = async function executeCommand(command) {
    if (window.isExecuting || !command.trim()) return;
    
    window.isExecuting = true;
    executeBtn.textContent = 'Executing...';
    executeBtn.style.opacity = '0.7';
    
    // Add command to history
    commandHistory.unshift(command);
    historyIndex = -1;
    
    // Display the command
    addTerminalLine(`Executing: ${command}`, 'info');
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Parse and execute command
    const result = await processCommand(command);
    addTerminalLine(result.message, result.type);
    
    // Clear input
    commandInput.value = '';
    
    window.isExecuting = false;
    executeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Execute
    `;
    executeBtn.style.opacity = '1';
}

// Process commands with intelligent routing
async function processCommand(command) {
    const cmd = command.toLowerCase().trim();
    
    // Direct command patterns - bypass AI for obvious tool requests
    const directPatterns = [
        // OS Detection
        { pattern: /find\s+os\s+of\s+(\S+)/, tool: 'nmap', flags: '-O', explanation: 'OS detection scan' },
        { pattern: /detect\s+os\s+(?:on|of)\s+(\S+)/, tool: 'nmap', flags: '-O', explanation: 'OS detection scan' },
        { pattern: /what\s+os\s+(?:is\s+)?(?:running\s+)?(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'nmap', flags: '-O', explanation: 'OS detection scan', extractTarget: true },
        
        // Port Scanning
        { pattern: /find\s+(?:all\s+)?open\s+ports?\s+(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'nmap', flags: '-p-', explanation: 'Full port scan (all 65535 ports)', extractTarget: true },
        { pattern: /scan\s+(?:all\s+)?ports?\s+(?:on|of)\s+(\S+)/, tool: 'nmap', flags: '-p-', explanation: 'Full port scan' },
        { pattern: /(?:what|which)\s+ports?\s+(?:are|is)\s+open\s+(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'nmap', flags: '-p-', explanation: 'Full port scan', extractTarget: true },
        { pattern: /scan\s+ports?\s+(?:on|of)\s+(\S+)/, tool: 'nmap', flags: '', explanation: 'Port scan' },
        { pattern: /scan\s+(\d+\.\d+\.\d+\.\d+|[\w\-\.]+)/, tool: 'nmap', flags: '', explanation: 'Port scan' },
        
        // Web Server Detection
        { pattern: /(?:what|which)\s+web\s+server\s+(?:is\s+)?(?:running\s+)?(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'whatweb', flags: '', explanation: 'Web technology detection', extractTarget: true },
        { pattern: /check\s+web\s+server\s+(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'whatweb', flags: '', explanation: 'Web technology detection', extractTarget: true },
        { pattern: /(?:what|which)\s+(?:services|software)\s+(?:are|is)\s+running\s+(?:on|of)\s+(?:that\s+ip|the\s+same\s+ip|(\S+))/, tool: 'nmap', flags: '-sV', explanation: 'Service version detection', extractTarget: true },
        
        // Vulnerabilities
        { pattern: /(?:find|check|scan)\s+vulnerabilities?\s+(?:on|of)\s+(http\S+)/, tool: 'nikto', flags: '-h', explanation: 'Web vulnerability scan' },
        { pattern: /(?:what|which)\s+vulnerabilities?\s+(?:are\s+)?(?:on|of)\s+(http\S+)/, tool: 'nikto', flags: '-h', explanation: 'Web vulnerability scan' },
        
        // Directory Enumeration
        { pattern: /enumerate\s+directories?\s+(?:on|of)\s+(http\S+)/, tool: 'dirb', flags: '', explanation: 'Directory enumeration' },
        { pattern: /find\s+directories?\s+(?:on|of)\s+(http\S+)/, tool: 'dirb', flags: '', explanation: 'Directory enumeration' },
        
        // Subdomain Discovery
        { pattern: /find\s+subdomains?\s+(?:of|for)\s+(\S+)/, tool: 'sublist3r', flags: '-d', explanation: 'Subdomain enumeration' },
    ];
    
    // Check direct patterns first
    for (const { pattern, tool, flags, explanation, extractTarget } of directPatterns) {
        const match = cmd.match(pattern);
        if (match) {
            let target = match[1];
            
            // Special case: "same ip" - extract from session history
            if (extractTarget && (!target || target === 'undefined')) {
                // Try to get the last target from session
                if (currentSession.targets.size > 0) {
                    target = Array.from(currentSession.targets)[currentSession.targets.size - 1];
                } else {
                    return { message: '⚠️ No previous target found. Please specify an IP address or domain.', type: 'warning' };
                }
            }
            
            const fullCommand = flags ? `${tool} ${flags} ${target}` : `${tool} ${target}`;
            addTerminalLine(`💡 ${explanation}`, 'info');
            addTerminalLine(`⚡ Auto-executing: ${fullCommand}`, 'info');
            return await executeSecurityTool(fullCommand, tool);
        }
    }
    
    // List of Kali tools that should be executed directly
    const kaliTools = [
        'nmap', 'masscan', 'nikto', 'dirb', 'dirbuster', 'sqlmap', 'hydra', 
        'john', 'hashcat', 'metasploit', 'msfconsole', 'searchsploit',
        'aircrack', 'wireshark', 'tcpdump', 'ettercap', 'burp', 'burpsuite',
        'wpscan', 'whatweb', 'whois', 'dig', 'host', 'setoolkit',
        'volatility', 'autopsy', 'foremost', 'hping3', 'medusa',
        'xsser', 'commix', 'openvas', 'lynis', 'reaver', 'wifite', 'armitage'
    ];
    
    // Check if command starts with any Kali tool
    const isDirectCommand = kaliTools.some(tool => cmd.startsWith(tool));
    
    if (isDirectCommand) {
        // Direct execution of security tools
        if (cmd.includes('nmap') && !cmd.includes('how') && !cmd.includes('what') && !cmd.includes('explain')) {
            return await executeSecurityTool(command, 'nmap');
        } else if (cmd.includes('scan') && !cmd.includes('how') && !cmd.includes('what')) {
            return await simulateScan(command);
        } else if (cmd.includes('sqlmap')) {
            return await executeSecurityTool(command, 'sqlmap');
        } else if (cmd.includes('nikto')) {
            return await executeSecurityTool(command, 'nikto');
        } else if (cmd.includes('hydra')) {
            return await executeSecurityTool(command, 'hydra');
        } else if (cmd.includes('searchsploit')) {
            return await executeSecurityTool(command, 'searchsploit');
        } else if (cmd.includes('metasploit') || cmd.includes('msfconsole')) {
            return { message: '🎯 Metasploit Framework loaded. Type "search <term>" to find exploits or "use <exploit>" to select a module.\n\nNote: Interactive console features coming soon!', type: 'success' };
        } else if (cmd.includes('wireshark')) {
            return { message: '🔍 Wireshark packet analyzer ready. Starting network capture...\n\nNote: GUI tools are simulated. Use tcpdump for actual packet capture.', type: 'info' };
        } else if (cmd.includes('burp')) {
            return { message: '🕷️ Burp Suite proxy started on localhost:8080.\n\nConfigure your browser proxy settings to use Burp as intercepting proxy.', type: 'info' };
        } else if (cmd.includes('tcpdump')) {
            return await executeSecurityTool(command, 'tcpdump');
        } else {
            // Generic tool execution
            return await executeSecurityTool(command, cmd.split(' ')[0]);
        }
    } else if (cmd === 'help') {
        return { 
            message: '🤖 Atom at your service, Chief.\n\nTalk naturally:\n• "check os on 192.168.1.1"\n• "scan that target"\n• "find vulnerabilities"\n\nOr direct commands:\n• nmap, sqlmap, nikto, hydra\n\nNinja ready. What\'s the target?', 
            type: 'info' 
        };
    } else {
        // Everything else goes to AI for natural language processing
        return await processWithAI(command);
    }
}

// Generic security tool executor for ALL Kali tools
async function executeSecurityTool(command, toolName) {
    addTerminalLine(`🔧 Initializing ${toolName}...`, 'info');
    addTerminalLine(`⚡ Executing: ${command}`, 'info');
    
    // Long-running tool warning with progress bar
    const slowTools = ['nikto', 'sqlmap', 'dirb', 'wpscan', 'masscan', 'nmap'];
    if (slowTools.includes(toolName)) {
        addTerminalLine(`⏳ ${toolName} scan in progress. This may take 2-10 minutes...`, 'warning');
        addProgressIndicator();
    } else {
        addTerminalLine('🔍 Connecting to Kali MCP, Chief...', 'info');
    }
    
    try {
        // Parse command into tool and arguments
        const parts = command.trim().split(/\s+/);
        const tool = parts[0]; // First part is the tool name
        const args = parts.slice(1); // Rest are arguments
        
        
        // Create abort controller with 10 minute timeout (600s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000);
        
        const response = await fetch(`${CONFIG.KALI_MCP_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tool: tool,
                args: args
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Remove progress indicator
        removeProgressIndicator();
        
        const scanOutput = data.result || data.stdout || '';
        
        // Store scan in session
        atomSession.addScan(command, scanOutput);
        
        // Auto-analyze for CVEs if it's a scan
        if (toolName === 'nmap' && scanOutput.length > 200) {
            setTimeout(() => analyzeCVEs(scanOutput, command), 1000);
        }
        
        if (data.stderr && data.stderr.trim()) {
            return { 
                message: `⚠️ ${toolName} warning:\n${data.stderr}\n\n${scanOutput}`, 
                type: 'warning',
                scanOutput 
            };
        }
        
        return {
            message: `✅ ${toolName} complete:\n\n${scanOutput}`,
            type: 'success',
            scanOutput
        };
    } catch (error) {
        
        // Remove progress indicator on error
        removeProgressIndicator();
        
        // Handle timeout specifically
        if (error.name === 'AbortError') {
            return {
                message: `⏱️ ${toolName} timeout after 10 minutes. Target may be slow or blocking scans.`,
                type: 'error'
            };
        }
        
        return {
            message: `❌ ${toolName} failed: ${error.message}`,
            type: 'error'
        };
    }
}

// Execute nmap scan - wrapper for backward compatibility
async function simulateNmap(command) {
    return await executeSecurityTool(command, 'nmap');
}

// Execute scan via GCP MCP Server (through proxy in production)
async function simulateScan(command) {
    addTerminalLine('🎯 Processing, Chief...', 'info');
    
    try {
        // Extract target from command
        const parts = command.trim().split(/\s+/);
        const target = parts[parts.length - 1];
        const options = '-Pn -T4 -F'; // Fast scan for "scan" command
        
        addTerminalLine(`⚡ Executing: nmap ${options} ${target}`, 'info');
        addTerminalLine('🥷 Connecting to Ninja...', 'info');
        addTerminalLine(`⚡ Scanning ${target}...`, 'info');
        
        // Use proxy endpoint in production, direct in dev
        const endpoint = CONFIG.KALI_MCP_ENDPOINT.includes('/api/kali') 
            ? `${CONFIG.KALI_MCP_ENDPOINT}/tools/nmap`
            : `${CONFIG.KALI_MCP_ENDPOINT}/api/tools/nmap`;
        
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, options })
        });
        
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP Server returned ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.stderr && data.stderr.trim()) {
            return { message: `⚠️ Scan error:\n${data.stderr}`, type: 'error' };
        }
        
        return {
            message: `✅ Scan complete:\n\n${data.result || 'No output received'}`,
            type: 'success'
        };
    } catch (error) {
        return {
            message: `❌ Mission failed, Chief: ${error.message}\n\nCheck browser console for details.`,
            type: 'error'
        };
    }
}

// Process with AI (Google Gemini) - Atom Personality
async function processWithAI(command) {
    try {
        addTerminalLine('🤖 Atom analyzing...', 'info');
        
        // Get chat context
        const chatContext = getChatContext();
        
        // Detect AI mode based on query criticality
        const criticalKeywords = ['vulnerability', 'exploit', 'attack chain', 'critical', 'advanced', 'find all'];
        const isCritical = criticalKeywords.some(kw => command.toLowerCase().includes(kw));
        const aiMode = isCritical ? 'accurate' : CONFIG.AI_MODE;
        
        if (aiMode === 'accurate') {
            addTerminalLine('🎯 Using ACCURATE mode (multi-AI consensus)...', 'info');
        }

        // Call Multi-AI endpoint
        const response = await fetch(CONFIG.AI_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: command,
                chatHistory: chatHistory.map(h => ({
                    role: h.user ? 'user' : 'model',
                    content: h.user || h.ai
                })),
                sessionData: currentSession,
                mode: aiMode
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Multi-AI API Error:', errorData);
            
            // Fallback to OpenAI endpoint if multi-AI fails
            console.log('⚠️  Falling back to OpenAI endpoint...');
            const fallbackResponse = await fetch(`${CONFIG.BACKEND_API_URL}/openai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: command,
                    chatHistory: chatHistory.map(h => ({
                        role: h.user ? 'user' : 'model',
                        content: h.user || h.ai
                    })),
                    sessionData: currentSession
                })
            });
            
            if (!fallbackResponse.ok) {
                throw new Error('All AI endpoints failed');
            }
            
            const fallbackData = await fallbackResponse.json();
            return await handleAIResponse(command, fallbackData);
        }
        
        const data = await response.json();
        
        // Show AI metadata
        if (data.consensus) {
            addTerminalLine(`🎯 Consensus response (${data.confidence}% confidence, ${data.provider})`, 'success');
        } else {
            addTerminalLine(`🤖 Response from ${data.provider} (${data.model})`, 'info');
        }
        
        return await handleAIResponse(command, data);

    } catch (error) {
        console.error('AI Processing error:', error);
        return {
            message: `⚠️ AI error: ${error.message}`,
            type: 'error'
        };
    }
}

// Handle AI response (extracted for reuse)
async function handleAIResponse(command, data) {
    try {
        // If backend provided a parsed autoExecute command, run it immediately
        if (data.autoExecute && data.autoExecute.action === 'execute' && data.autoExecute.command) {
            const a = data.autoExecute;
            let attempts = 0;
            let maxAttempts = 5; // Increased for genius mode
            let currentCommand = a.command;
            let currentExplanation = a.explanation;
            let lastOutput = '';
            let discoveredServices = [];
            let discoveredVulns = [];
            
            // Display tactical intelligence if provided
            if (a.intelligence) {
                addTerminalLine(`🧠 TACTICAL INTEL: ${a.intelligence}`, 'info');
            }
            
            // Multi-iteration loop until success or max attempts
            while (attempts < maxAttempts) {
                attempts++;
                
                addTerminalLine(`💡 ${currentExplanation}`, 'info');
                addTerminalLine(`⚡ ${attempts > 1 ? 'Attempt ' + attempts + ': ' : 'Auto-executing: '}${currentCommand}`, 'info');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Execute directly without re-parsing (AI already provided correct command)
                const parts = currentCommand.trim().split(/\s+/);
                const toolName = parts[0];
                const result = await executeSecurityTool(currentCommand, toolName);
                lastOutput = result.message || '';
                
                // Check for success indicators (more comprehensive)
                const hasVulnerabilities = lastOutput.includes('VULNERABLE') || 
                                          lastOutput.includes('vulnerable') ||
                                          lastOutput.includes('exploit') ||
                                          lastOutput.includes('CVE-') ||
                                          lastOutput.includes('XSS') ||
                                          lastOutput.includes('SQL injection') ||
                                          lastOutput.includes('Apache') ||
                                          lastOutput.includes('nginx') ||
                                          lastOutput.includes('IIS') ||
                                          lastOutput.match(/\d+\/tcp.*open/i) ||
                                          (lastOutput.includes('open') && lastOutput.length > 300);
                
                // Auto-extract discovered services for intelligent next steps
                const openPortsMatch = lastOutput.match(/(\d+)\/tcp\s+open\s+(\w+)/gi);
                if (openPortsMatch) {
                    openPortsMatch.forEach(match => {
                        const parts = match.match(/(\d+)\/tcp\s+open\s+(\w+)/i);
                        if (parts) {
                            discoveredServices.push({ port: parts[1], service: parts[2] });
                        }
                    });
                }
                
                // Auto-extract vulnerabilities
                if (lastOutput.includes('CVE-')) {
                    const cveMatches = lastOutput.match(/CVE-\d{4}-\d{4,}/gi);
                    if (cveMatches) discoveredVulns.push(...cveMatches);
                }
                
                // Check for failures
                const hostDown = lastOutput.includes('Host seems down') || 
                                lastOutput.includes('Note: Host seems down');
                const noHostsUp = lastOutput.includes('0 hosts up');
                const timeout = lastOutput.includes('timeout') || lastOutput.includes('timed out');
                const refused = lastOutput.includes('refused') || lastOutput.includes('Connection refused');
                const filtered = lastOutput.includes('filtered') && !lastOutput.includes('open');
                const noResults = lastOutput.length < 150 && !hasVulnerabilities;
                
                // SUCCESS - Found vulnerabilities or good results
                if (hasVulnerabilities || (lastOutput.length > 300 && !hostDown && !noHostsUp)) {
                    addTerminalLine('✅ Attack vector discovered!', 'success');
                    
                    // Display discovered intelligence
                    if (discoveredServices.length > 0) {
                        addTerminalLine(`🎯 DISCOVERED SERVICES: ${discoveredServices.map(s => `${s.service}:${s.port}`).join(', ')}`, 'success');
                    }
                    if (discoveredVulns.length > 0) {
                        addTerminalLine(`🚨 VULNERABILITIES FOUND: ${discoveredVulns.join(', ')}`, 'warning');
                    }
                    
                    saveChatInteraction(command, `Success after ${attempts} attempt(s)`, currentCommand, lastOutput);
                    return result;
                }
                
                // FAILURE - Need to retry with smart adjustments
                if (attempts < maxAttempts) {
                    addTerminalLine(`🧠 ATOM AI: Adapting strategy. Attempt ${attempts}/${maxAttempts}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // GENIUS MODE: Intelligent tool progression
                    let nextCommand = '';
                    let nextExplanation = '';
                    const target = extractTarget(currentCommand);
                    
                    // OSINT chain with intelligent escalation
                    if (command.toLowerCase().includes('osint') || command.toLowerCase().includes('recon')) {
                        if (currentCommand.includes('whois')) {
                            nextCommand = `dig ${target} ANY`;
                            nextExplanation = 'Phase 2: DNS record enumeration';
                        } else if (currentCommand.includes('dig')) {
                            nextCommand = `nslookup ${target}`;
                            nextExplanation = 'Phase 3: DNS lookup verification';
                        } else if (currentCommand.includes('nslookup')) {
                            nextCommand = `whatweb http://${target}`;
                            nextExplanation = 'Phase 4: Web technology fingerprinting';
                        } else if (currentCommand.includes('whatweb')) {
                            nextCommand = `curl -sI http://${target}`;
                            nextExplanation = 'Phase 5: HTTP header analysis';
                        } else if (currentCommand.includes('curl')) {
                            nextCommand = `nmap -Pn -sV ${target}`;
                            nextExplanation = 'Phase 6: Port scan & service detection';
                        } else {
                            nextCommand = `whois ${target}`;
                            nextExplanation = 'Phase 1: WHOIS lookup';
                        }
                    } else if (hostDown || noHostsUp) {
                        // Host blocking pings - add -Pn
                        if (!currentCommand.includes('-Pn')) {
                            nextCommand = currentCommand.replace('nmap', 'nmap -Pn');
                            nextExplanation = 'Host may be blocking ICMP - bypassing with -Pn';
                        } else if (!currentCommand.includes('http://') && !currentCommand.includes('https://')) {
                            // Try web tools on HTTP/HTTPS
                            nextCommand = `whatweb http://${target}`;
                            nextExplanation = 'Switching to HTTP-based web fingerprinting';
                        } else {
                            nextCommand = `curl -I http://${target}`;
                            nextExplanation = 'Checking HTTP headers directly with curl';
                        }
                    } else if (filtered && currentCommand.includes('nmap')) {
                        // Ports filtered, try service-specific tools
                        if (attempts === 2) {
                            nextCommand = `whatweb -a 3 http://${target}`;
                            nextExplanation = 'Aggressive web technology detection';
                        } else {
                            nextCommand = `nikto -h http://${target}`;
                            nextExplanation = 'Web vulnerability scan with Nikto';
                        }
                    } else if (noResults || timeout) {
                        // Switch tools strategically based on what was tried
                        if (currentCommand.includes('nikto')) {
                            nextCommand = `nmap -Pn -sV --script=vuln ${target}`;
                            nextExplanation = 'Deep vulnerability scan with Nmap NSE scripts';
                        } else if (currentCommand.includes('whatweb')) {
                            nextCommand = `nmap -Pn -p 80,443,8080,8443 -sV ${target}`;
                            nextExplanation = 'Scanning common web ports with service detection';
                        } else if (currentCommand.includes('nmap') && !currentCommand.includes('--script')) {
                            nextCommand = `nmap -Pn -sV --script=http-*,ssl-* ${target}`;
                            nextExplanation = 'Running HTTP and SSL vulnerability scripts';
                        } else if (currentCommand.includes('nmap') && !currentCommand.includes('-p-')) {
                            nextCommand = `nmap -Pn -p- --min-rate 1000 ${target}`;
                            nextExplanation = 'Fast full port scan (all 65535 ports)';
                        } else {
                            nextCommand = `dnsenum --enum ${target}`;
                            nextExplanation = 'DNS enumeration to find subdomains';
                        }
                    } else {
                        // Ask AI for intelligent next step
                        addTerminalLine(`💭 Consulting AI for next strategy...`, 'info');
                        const aiPrompt = `Original goal: "${command}"\nAttempt ${attempts} used: ${currentCommand}\nResult summary: ${lastOutput.substring(0, 300)}\n\nSuggest a DIFFERENT tool or method to achieve the goal. Available tools: nmap, nikto, whatweb, sqlmap, whois, dig, nslookup, curl, dirb. DO NOT USE: theharvester, dnsenum. Return JSON: {"action":"execute","command":"[full command]","explanation":"[why this approach]"}`;
                        
                        try {
                            const aiResponse = await fetch(CONFIG.AI_ENDPOINT, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    message: aiPrompt,
                                    chatHistory: [],
                                    mode: 'fast'
                                })
                            });
                            
                            if (aiResponse.ok) {
                                const aiData = await aiResponse.json();
                                if (aiData.autoExecute && aiData.autoExecute.command) {
                                    nextCommand = aiData.autoExecute.command;
                                    nextExplanation = aiData.autoExecute.explanation || 'AI-suggested alternative approach';
                                    addTerminalLine(`🤖 AI suggests: ${nextExplanation}`, 'info');
                                }
                            }
                        } catch (e) {
                            console.log('AI suggestion failed, using fallback');
                        }
                        
                        // Fallback if AI doesn't provide suggestion
                        if (!nextCommand) {
                            nextCommand = `dig ${target} ANY`;
                            nextExplanation = 'DNS record enumeration as alternative approach';
                        }
                    }
                    
                    if (nextCommand && nextCommand !== currentCommand) {
                        currentCommand = nextCommand;
                        currentExplanation = nextExplanation;
                    } else {
                        // Can't find new approach, stop
                        break;
                    }
                } else {
                    // Max attempts reached
                    addTerminalLine('⚠️ Atom: Tried multiple methods, showing last results', 'warning');
                    saveChatInteraction(command, `${attempts} attempts made`, currentCommand, lastOutput);
                    return result;
                }
            }
            
            // Fallback - return last result
            saveChatInteraction(command, a.explanation, currentCommand, lastOutput);
            return { message: lastOutput, type: 'info' };
        }
        
        // Helper function to extract target IP/domain from command
        function extractTarget(cmd) {
            const parts = cmd.split(' ');
            for (let i = parts.length - 1; i >= 0; i--) {
                const part = parts[i];
                if (part.match(/^\d+\.\d+\.\d+\.\d+$/) || part.match(/^[a-z0-9.-]+\.[a-z]{2,}$/i)) {
                    return part;
                }
            }
            return parts[parts.length - 1];
        }
        
        // Handle the OpenAI API response format
        const aiResponse = (data.response || data.reply || '').trim();
        
        if (!aiResponse) {
            console.error('Unexpected API response:', data);
            throw new Error('Invalid response format from AI');
        }
        
        // Check if AI returned multiple commands (genius mode)
        // Handle both array format [{"action":...}] and multiple objects
        if (aiResponse.startsWith('[') && aiResponse.includes('"action"')) {
            // Array format
            try {
                const commands = JSON.parse(aiResponse);
                if (Array.isArray(commands) && commands.length > 0) {
                    addTerminalLine('🧠 GENIUS MODE: Multi-phase attack chain detected!', 'success');
                    addTerminalLine(`📋 ATTACK PLAN: ${commands.length} phases identified`, 'info');
                    
                    // Execute each command sequentially
                    let allResults = '';
                    for (let i = 0; i < commands.length; i++) {
                        const cmd = commands[i];
                        if (cmd.action !== 'execute' || !cmd.command) continue;
                        
                        addTerminalLine(`\n━━━ PHASE ${i + 1}/${commands.length} ━━━`, 'info');
                        addTerminalLine(`💡 ${cmd.explanation}`, 'info');
                        if (cmd.intelligence) {
                            addTerminalLine(`🧠 INTEL: ${cmd.intelligence}`, 'info');
                        }
                        addTerminalLine(`⚡ Executing: ${cmd.command}`, 'info');
                        
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        // Execute directly
                        const parts = cmd.command.trim().split(/\s+/);
                        const toolName = parts[0];
                        const result = await executeSecurityTool(cmd.command, toolName);
                        
                        allResults += `\n\n=== PHASE ${i + 1}: ${cmd.explanation} ===\n${result.message}\n`;
                        
                        // Brief pause between phases
                        if (i < commands.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }
                    
                    addTerminalLine('\n━━━ ATTACK CHAIN COMPLETE ━━━', 'success');
                    saveChatInteraction(command, `Multi-phase attack: ${commands.length} phases`, commands.map(c => c.command).join('; '), allResults);
                    
                    return {
                        message: allResults,
                        type: 'success'
                    };
                }
            } catch (e) {
                console.error('Failed to parse array format:', e);
            }
        }
        
        // Handle multiple separate JSON objects (fallback)
        if (aiResponse.includes('{\n  "action"') && aiResponse.split('{\n  "action"').length > 2) {
            addTerminalLine('🧠 GENIUS MODE: Multi-phase attack chain detected!', 'success');
            
            // Extract all JSON command objects
            const commands = [];
            const jsonMatches = aiResponse.match(/\{[^}]*"action":\s*"execute"[^}]*\}/g);
            
            if (jsonMatches && jsonMatches.length > 0) {
                for (const jsonStr of jsonMatches) {
                    try {
                        const parsed = JSON.parse(jsonStr);
                        if (parsed.action === 'execute' && parsed.command) {
                            commands.push(parsed);
                        }
                    } catch (e) {
                        console.log('Failed to parse JSON:', jsonStr);
                    }
                }
            }
            
            if (commands.length > 0) {
                addTerminalLine(`📋 ATTACK PLAN: ${commands.length} phases identified`, 'info');
                
                // Execute each command sequentially
                let allResults = '';
                for (let i = 0; i < commands.length; i++) {
                    const cmd = commands[i];
                    addTerminalLine(`\n━━━ PHASE ${i + 1}/${commands.length} ━━━`, 'info');
                    addTerminalLine(`💡 ${cmd.explanation}`, 'info');
                    if (cmd.intelligence) {
                        addTerminalLine(`🧠 INTEL: ${cmd.intelligence}`, 'info');
                    }
                    addTerminalLine(`⚡ Executing: ${cmd.command}`, 'info');
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Execute directly
                    const parts = cmd.command.trim().split(/\s+/);
                    const toolName = parts[0];
                    const result = await executeSecurityTool(cmd.command, toolName);
                    
                    allResults += `\n\n=== PHASE ${i + 1}: ${cmd.explanation} ===\n${result.message}\n`;
                    
                    // Brief pause between phases
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                addTerminalLine('\n━━━ ATTACK CHAIN COMPLETE ━━━', 'success');
                saveChatInteraction(command, `Multi-phase attack: ${commands.length} phases`, commands.map(c => c.command).join('; '), allResults);
                
                return {
                    message: allResults,
                    type: 'success'
                };
            }
        }
        
        // Check if AI wants to execute a command (JSON response)
        if (aiResponse.startsWith('{') && aiResponse.includes('"action"')) {
            try {
                const parsed = JSON.parse(aiResponse);
                
                if (parsed.action === 'execute' && parsed.command) {
                    // AI has decided to execute a command
                    addTerminalLine(`💡 ${parsed.explanation || 'Executing command'}`, 'info');
                    addTerminalLine(`⚡ Auto-executing: ${parsed.command}`, 'info');
                    
                    // Execute the command automatically
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const result = await processCommand(parsed.command);
                    
                    // Save to chat history with scan result
                    saveChatInteraction(command, parsed.explanation, parsed.command, result.message);
                    
                    return result;
                }
            } catch (parseError) {
                console.log('Not a JSON command response, treating as regular text');
            }
        }
        
        // Regular AI response (not a command)
        // Save to chat history
        saveChatInteraction(command, aiResponse);
        
        return {
            message: `🤖 Atom: ${aiResponse}`,
            type: 'success'
        };
    } catch (error) {
        console.error('AI Error:', error);
        
        // Check if backend is reachable
        if (error.message.includes('fetch')) {
            return {
                message: `⚠️ Cannot connect to backend server.\n\n1. Make sure backend is running: npm start\n2. Backend should be at: ${CONFIG.BACKEND_API_URL}\n3. Check CORS settings\n\nMeanwhile, try direct commands: nmap, scan, metasploit, wireshark, or 'help'`,
                type: 'error'
            };
        }
        
        return {
            message: `⚠️ Atom error: ${error.message}\n\nDirect commands available: nmap, sqlmap, help`,
            type: 'error'
        };
    }
}

// Execute button handler - ensure proper binding
function setupExecuteHandlers() {
    const btn = document.getElementById('executeBtn');
    const input = document.getElementById('commandInput');
    
    if (!btn || !input) {
        console.error('Execute button or command input not found');
        setTimeout(setupExecuteHandlers, 500); // Retry after 500ms
        return;
    }
    
    console.log('✓ Setting up execute handlers...');
    
    // Simple, reliable click handler
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        const command = input.value.trim();
        if (command && !isExecuting) {
            console.log('➡️ Executing:', command);
            executeCommand(command);
        }
    });
    
    // Enter key handler - simplified and reliable
    input.addEventListener('keydown', function(e) {
        // Execute on Enter (but allow Shift+Enter for newlines)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const command = input.value.trim();
            if (command && !isExecuting) {
                console.log('⏎ Enter pressed, executing...');
                executeCommand(command);
            }
            return false;
        }
        
        // Command history with arrow keys
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                historyIndex++;
                input.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                input.value = commandHistory[historyIndex];
            } else if (historyIndex === 0) {
                historyIndex = -1;
                input.value = '';
            }
        }
    });
    
    console.log('✅ Execute handlers initialized successfully');
}

// Initialize DOM elements
commandInput = document.getElementById('commandInput');
executeBtn = document.getElementById('executeBtn');
terminalOutput = document.getElementById('terminalOutput');
launchBtn = document.getElementById('launchBtn');
docsBtn = document.getElementById('docsBtn');

// Launch console button
launchBtn.addEventListener('click', () => {
    commandInput.focus();
    document.querySelector('.demo-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Setup execute handlers inside DOMContentLoaded
setupExecuteHandlers();

// Documentation button
docsBtn.addEventListener('click', () => {
    addTerminalLine('Documentation: Visit https://atoms.ninja/docs for reference', 'info');
});

// Add typing effect to command input
commandInput.addEventListener('focus', () => {
    commandInput.style.transform = 'scale(1.01)';
});

commandInput.addEventListener('blur', () => {
    commandInput.style.transform = 'scale(1)';
});
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('.demo-card');
            
            parallaxElements.forEach(el => {
                const speed = 0.5;
                const yPos = -(scrolled * speed);
                el.style.transform = `translateY(${yPos}px)`;
            });
            
            ticking = false;
        });
        ticking = true;
    }
});

// Add floating animation to feature cards
const featureCards = document.querySelectorAll('.feature-card');

featureCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-12px) rotate(1deg)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) rotate(0deg)';
    });
});

// Button ripple effect
const buttons = document.querySelectorAll('button');

buttons.forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple effect styles dynamically
const style = document.createElement('style');
style.textContent = `
    button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all feature cards and stats
const animatedElements = document.querySelectorAll('.feature-card, .stat-item');
animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add cursor glow effect
const cursorGlow = document.createElement('div');
cursorGlow.style.cssText = `
    position: fixed;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    opacity: 0;
`;
document.body.appendChild(cursorGlow);

document.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.style.opacity = '1';
});

document.addEventListener('mouseleave', () => {
    cursorGlow.style.opacity = '0';
});

// Console Easter egg
console.log('%c🥷 Atoms Ninja - Cybersecurity Platform', 'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;');
console.log('%c⚠️  For authorized security testing only!', 'font-size: 14px; color: #EF4444; font-weight: bold;');
console.log('%cPowered by Atom AI & Ninja Engine', 'font-size: 12px; color: #00ff00;');

// API Configuration Helper
window.setGeminiAPIKey = function(apiKey) {
    CONFIG.GEMINI_API_KEY = apiKey;
    console.log('%c✓ Gemini API Key configured successfully!', 'color: #10B981; font-weight: bold;');
    addTerminalLine('Google Gemini AI authentication successful.', 'success');
};

// Clear chat history helper
window.clearChatHistory = function() {
    chatHistory = [];
    localStorage.removeItem('atomsNinjaChatHistory');
    console.log('%c✓ Chat history cleared!', 'color: #10B981; font-weight: bold;');
    addTerminalLine('Chat memory cleared. Starting fresh conversation.', 'info');
};

// View chat history helper
window.viewChatHistory = function() {
    console.log('%c📝 Chat History:', 'font-size: 16px; font-weight: bold; color: #8B5CF6;');
    chatHistory.forEach((interaction, index) => {
        console.log(`%c--- Interaction ${index + 1} ---`, 'color: #EC4899; font-weight: bold;');
        console.log(`User: ${interaction.user}`);
        console.log(`AI: ${interaction.ai.substring(0, 100)}...`);
        if (interaction.command) console.log(`Executed: ${interaction.command}`);
    });
};

// Advanced session management
window.viewSession = function() {
    console.log('%c📊 Current Session Intelligence:', 'font-size: 18px; font-weight: bold; color: #8B5CF6;');
    console.log('%c' + getSessionSummary(), 'color: #10B981;');
    
    if (currentSession.findings.length > 0) {
        console.log('%c🔍 Findings:', 'font-size: 14px; font-weight: bold; color: #EC4899;');
        currentSession.findings.forEach((finding, i) => {
            console.log(`${i + 1}. [${finding.tool}] ${finding.target} - ${finding.result.substring(0, 100)}...`);
        });
    }
    
    if (currentSession.vulnerabilities.length > 0) {
        console.log('%c⚠️  Vulnerabilities:', 'font-size: 14px; font-weight: bold; color: #EF4444;');
        currentSession.vulnerabilities.forEach((vuln, i) => {
            console.log(`${i + 1}. [${vuln.severity.toUpperCase()}] ${vuln.type}`);
        });
    }
};

window.startNewSession = function() {
    startNewSession();
    console.log('%c✓ New session started!', 'color: #10B981; font-weight: bold;');
    addTerminalLine('New penetration testing session initialized.', 'success');
};

window.exportSession = function() {
    const exportData = {
        session: currentSession,
        chatHistory: chatHistory,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, (key, value) => {
        if (value instanceof Set) return Array.from(value);
        return value;
    }, 2);
    
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atoms-ninja-session-${Date.now()}.json`;
    a.click();
    
    console.log('%c✓ Session exported!', 'color: #10B981; font-weight: bold;');
};

// Generate penetration testing report
window.generateReport = function() {
    const report = `
═══════════════════════════════════════════════════════════════
ATOMS NINJA - PENETRATION TESTING REPORT
═══════════════════════════════════════════════════════════════

Session ID: ${currentSession.id}
Start Time: ${currentSession.startTime}
Duration: ${Math.round((Date.now() - currentSession.id) / 1000 / 60)} minutes

SCOPE
─────
Targets Scanned: ${currentSession.targets.size}
${Array.from(currentSession.targets).map(t => `  • ${t}`).join('\n')}

METHODOLOGY
───────────
Tools Used: ${Array.from(currentSession.toolsUsed).join(', ')}
Total Operations: ${currentSession.findings.length}

FINDINGS
────────
${currentSession.findings.map((f, i) => `
${i + 1}. [${f.tool.toUpperCase()}] ${f.target}
   Timestamp: ${f.timestamp}
   Result: ${f.result.substring(0, 200)}...
`).join('\n')}

VULNERABILITIES DETECTED
────────────────────────
${currentSession.vulnerabilities.length === 0 ? 'None detected in automated scans.' : 
currentSession.vulnerabilities.map((v, i) => `
${i + 1}. [${v.severity.toUpperCase()}] ${v.type}
   Detected: ${v.timestamp}
   Details: ${v.details}
`).join('\n')}

RECOMMENDATIONS
───────────────
${currentSession.recommendations.length === 0 ? '• Conduct manual verification of automated findings\n• Review security configurations\n• Implement security best practices' :
currentSession.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

═══════════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
Tool: Atoms Ninja Cybersecurity Platform
═══════════════════════════════════════════════════════════════
`;
    
    console.log(report);
    
    // Download as file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pentest-report-${Date.now()}.txt`;
    a.click();
    
    addTerminalLine('✓ Penetration testing report generated and downloaded!', 'success');
};

// Display instructions on load
window.addEventListener('load', () => {
    // Load chat history and session from localStorage
    loadChatHistory();
    loadCurrentSession();
    
    // Setup execute handlers (ensure DOM is ready)
    setupExecuteHandlers();
    
    console.log(`%c📝 Loaded ${chatHistory.length} previous interactions from memory`, 'color: #10B981;');
    console.log(`%c📊 Session: ${currentSession.targets.size} targets, ${currentSession.findings.length} findings`, 'color: #10B981;');
    console.log('%c🚀 Advanced Features Available:', 'font-size: 14px; font-weight: bold; color: #8B5CF6;');
    console.log('%c  • viewSession() - View current session intelligence', 'color: #8B5CF6;');
    console.log('%c  • viewChatHistory() - View conversation history', 'color: #8B5CF6;');
    console.log('%c  • generateReport() - Generate penetration testing report', 'color: #8B5CF6;');
    console.log('%c  • exportSession() - Export session data', 'color: #8B5CF6;');
    console.log('%c  • startNewSession() - Start new testing session', 'color: #8B5CF6;');
    console.log('%c  • clearChatHistory() - Clear memory', 'color: #8B5CF6;');
    
    console.log('%cTo enable AI features, run: setGeminiAPIKey("your-api-key-here")', 'color: #8B5CF6; font-style: italic;');
});

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeModal = document.getElementById('closeModal');
const saveGeminiKey = document.getElementById('saveGeminiKey');
const testMCPConnection = document.getElementById('testMCPConnection');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const mcpEndpointInput = document.getElementById('mcpEndpoint');

// Open settings modal
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    // Load saved values
    if (CONFIG.GEMINI_API_KEY) {
        geminiApiKeyInput.value = CONFIG.GEMINI_API_KEY;
    }
});

// Close modal
closeModal.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

// Close on outside click
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Save Gemini API Key
saveGeminiKey.addEventListener('click', () => {
    const apiKey = geminiApiKeyInput.value.trim();
    const statusDiv = document.getElementById('apiKeyStatus');
    
    if (!apiKey) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Please enter a valid API key';
        return;
    }
    
    CONFIG.GEMINI_API_KEY = apiKey;
    if (typeof AtomsNinjaConfig !== 'undefined') {
        AtomsNinjaConfig.gemini.apiKey = apiKey;
    }
    
    // Save to localStorage
    localStorage.setItem('gemini_api_key', apiKey);
    
    statusDiv.className = 'status-message success';
    statusDiv.textContent = '✅ API key saved successfully! AI features are now enabled.';
    
    addTerminalLine('Google Gemini AI configured and ready.', 'success');
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
});

// Test MCP Connection
testMCPConnection.addEventListener('click', async () => {
    const endpoint = mcpEndpointInput.value.trim();
    const statusDiv = document.getElementById('mcpStatus');
    
    statusDiv.className = 'status-message info';
    statusDiv.textContent = '🔄 Testing connection...';
    
    try {
        // Simulate connection test (replace with actual MCP server check)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        CONFIG.KALI_MCP_ENDPOINT = endpoint;
        if (typeof AtomsNinjaConfig !== 'undefined') {
            AtomsNinjaConfig.kaliMCP.endpoint = endpoint;
        }
        
        localStorage.setItem('mcp_endpoint', endpoint);
        
        statusDiv.className = 'status-message success';
        statusDiv.textContent = '✅ Connected to Kali Linux MCP Server';
        
        addTerminalLine(`MCP Server connected at ${endpoint}`, 'success');
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Connection failed. Please check the endpoint and try again.';
    }
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
});

// Load saved configuration on startup
window.addEventListener('load', () => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    const savedEndpoint = localStorage.getItem('mcp_endpoint');
    
    if (savedApiKey) {
        CONFIG.GEMINI_API_KEY = savedApiKey;
        if (typeof AtomsNinjaConfig !== 'undefined') {
            AtomsNinjaConfig.gemini.apiKey = savedApiKey;
        }
        addTerminalLine('Loaded saved Google Gemini API configuration.', 'info');
    }
    
    if (savedEndpoint) {
        CONFIG.KALI_MCP_ENDPOINT = savedEndpoint;
        if (typeof AtomsNinjaConfig !== 'undefined') {
            AtomsNinjaConfig.kaliMCP.endpoint = savedEndpoint;
        }
        mcpEndpointInput.value = savedEndpoint;
    }
});

// Quick command clicks
document.querySelectorAll('.quick-commands code').forEach(codeEl => {
    codeEl.addEventListener('click', () => {
        commandInput.value = codeEl.textContent;
        commandInput.focus();
        settingsModal.classList.remove('active');
        document.querySelector('.demo-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
});

// End of DOMContentLoaded
});

// CVE Analysis and Visualization
async function analyzeCVEs(scanOutput, originalCommand) {
    try {
        addTerminalLine('🔍 Analyzing for known vulnerabilities...', 'info');
        
        const response = await fetch(`${CONFIG.BACKEND_API_URL}/cve-lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanOutput })
        });
        
        if (!response.ok) throw new Error('CVE lookup failed');
        
        const data = await response.json();
        
        if (data.vulnerabilities && data.vulnerabilities.length > 0) {
            // Add vulnerabilities to session
            atomSession.currentSession.vulnerabilities.push(...data.vulnerabilities);
            atomSession.saveCurrentSession();
            
            // Display formatted results
            addTerminalLine(`\n${'═'.repeat(60)}`, 'info');
            addTerminalLine('🎯 VULNERABILITY ANALYSIS', 'success');
            addTerminalLine(`${'═'.repeat(60)}`, 'info');
            
            addTerminalLine(`\n${data.summary}`, 'warning');
            
            addTerminalLine(`\n${'─'.repeat(60)}`, 'info');
            addTerminalLine('📋 DETECTED SOFTWARE:', 'info');
            for (const sw of data.detectedSoftware) {
                addTerminalLine(`  • ${sw.software} ${sw.version}`, 'info');
            }
            
            addTerminalLine(`\n${'─'.repeat(60)}`, 'info');
            addTerminalLine('🔴 VULNERABILITIES FOUND:', 'error');
            for (const vuln of data.vulnerabilities.slice(0, 5)) {
                const severity = vuln.severity === 'CRITICAL' ? '🔴' : vuln.severity === 'HIGH' ? '🟠' : '🟡';
                addTerminalLine(`\n  ${severity} ${vuln.cve} [${vuln.severity}]`, 'error');
                addTerminalLine(`     ${vuln.description}`, 'info');
                if (vuln.exploitable) {
                    addTerminalLine(`     ⚡ EXPLOIT AVAILABLE`, 'warning');
                }
            }
            
            if (data.vulnerabilities.length > 5) {
                addTerminalLine(`\n  ... and ${data.vulnerabilities.length - 5} more vulnerabilities`, 'info');
            }
            
            addTerminalLine(`\n${'═'.repeat(60)}\n`, 'info');
            
            // Suggest attack chains
            setTimeout(() => suggestAttackChain(scanOutput, data.vulnerabilities), 1500);
        } else {
            addTerminalLine('✅ No known critical vulnerabilities detected.', 'success');
        }
    } catch (error) {
        console.error('CVE analysis error:', error);
    }
}

// Smart Attack Chain Suggestions
async function suggestAttackChain(scanOutput, vulnerabilities) {
    try {
        addTerminalLine('🎯 Generating attack chain suggestions...', 'info');
        
        const target = extractTarget(scanOutput);
        
        const response = await fetch(`${CONFIG.BACKEND_API_URL}/attack-chain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanOutput, vulnerabilities, target })
        });
        
        if (!response.ok) throw new Error('Attack chain generation failed');
        
        const data = await response.json();
        
        if (data.chains && data.chains.length > 0) {
            addTerminalLine(`\n${'═'.repeat(60)}`, 'info');
            addTerminalLine('⚔️  SUGGESTED ATTACK CHAINS', 'success');
            addTerminalLine(`${'═'.repeat(60)}`, 'info');
            
            for (const chain of data.chains) {
                addTerminalLine(`\n📌 ${chain.target}:`, 'warning');
                for (const step of chain.steps.slice(0, 3)) {
                    const risk = step.risk === 'CRITICAL' ? '🔴' : step.risk === 'HIGH' ? '🟠' : '🟡';
                    addTerminalLine(`\n  ${risk} Step ${step.step}: ${step.action}`, 'info');
                    addTerminalLine(`     $ ${step.command}`, 'success');
                }
            }
            
            if (data.aiSuggestions) {
                addTerminalLine(`\n${'─'.repeat(60)}`, 'info');
                addTerminalLine('🤖 AI ANALYSIS:', 'info');
                addTerminalLine(data.aiSuggestions, 'info');
            }
            
            addTerminalLine(`\n${'═'.repeat(60)}\n`, 'info');
            addTerminalLine('💡 Type any command above to execute it, Chief.', 'success');
        }
    } catch (error) {
        console.error('Attack chain error:', error);
    }
}

function extractTarget(scanOutput) {
    const ipMatch = scanOutput.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const domainMatch = scanOutput.match(/([a-z0-9-]+\.)+[a-z]{2,}/i);
    return ipMatch ? ipMatch[0] : (domainMatch ? domainMatch[0] : 'TARGET');
}

// Export report command
window.exportReport = function() {
    atomSession.exportReport();
};

// FINAL FIX - Ensure handlers work after everything loads
window.addEventListener('load', function() {
    console.log('�� Window loaded - final handler setup');
    const btn = document.getElementById('executeBtn');
    const input = document.getElementById('commandInput');
    
    if (btn && input) {
        console.log('✓ Found button and input');
        
        // Remove all existing listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Fresh click listener
        newBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const cmd = input.value.trim();
            console.log('🖱️ Button clicked:', cmd);
            if (cmd && !isExecuting) {
                setTimeout(() => window.executeCommand(cmd), 0);
            }
        });
        
        // Fresh keydown listener
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.stopPropagation();
                e.preventDefault();
                const cmd = input.value.trim();
                console.log('⏎ Enter pressed:', cmd);
                if (cmd && !isExecuting) {
                    setTimeout(() => window.executeCommand(cmd), 0);
                }
            }
        });
        
        console.log('✅ FINAL HANDLERS ATTACHED');
    } else {
        console.error('❌ Elements not found');
    }
});
