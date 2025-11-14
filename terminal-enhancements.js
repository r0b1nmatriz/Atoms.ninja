// Enhanced Hacking Terminal Features for Atoms.Ninja
// Cybersecurity-focused interactive AI

// Quick commands for hacking operations
const hackingCommands = {
    'help': () => {
        return `
╔════════════════════════════════════════════════════════════╗
║  🥷 ATOMS.NINJA - CYBER OPERATIONS COMMAND CENTER         ║
╚════════════════════════════════════════════════════════════╝

🎯 HACKING COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• targets              - List all scanned targets
• vulns                - Show discovered vulnerabilities  
• sessions             - View Metasploit sessions
• findings             - Display all security findings
• payload <platform>   - Quick generate payload
• listen <port>        - Start Metasploit listener
• exploit <target>     - Launch exploitation chain
• clear                - Clear terminal

🔍 RECON COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• scan <target>        - Auto-detect and scan
• ports <target>       - Quick port scan
• web <url>            - Web app scan
• dns <domain>         - DNS enumeration
• subs <domain>        - Find subdomains

💉 EXPLOITATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• sqli <url>           - SQL injection test
• xss <url>            - XSS vulnerability scan
• lfi <url>            - Local file inclusion
• rce <target>         - Remote code execution
• brute <target>       - Brute force attack

💬 AI COMMANDS (Natural Language):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Just talk to Atom:
  "check what's running on 192.168.1.1"
  "find sql injection in example.com"
  "scan all ports on target"
  "generate windows payload"

🔧 DIRECT COMMANDS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run any tool directly:
  nmap -sV 192.168.1.1
  sqlmap -u http://target.com --dbs
  nikto -h http://target.com
  hydra -L users.txt -P pass.txt ssh://target

Type 'help <command>' for detailed usage.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    },
    
    'targets': () => {
        const sessionManager = window.sessionManager || { currentSession: { targets: [] } };
        const targets = Array.from(sessionManager.currentSession.targets || []);
        
        if (targets.length === 0) {
            return '⚠️  No targets scanned yet. Try: scan <target>';
        }
        
        return `
🎯 TARGETS IN CURRENT SESSION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${targets.map((t, i) => `  ${i+1}. ${t}`).join('\n')}

Total: ${targets.length} target(s)
Use: scan <target> to add more`;
    },
    
    'vulns': () => {
        const sessionManager = window.sessionManager || { currentSession: { vulnerabilities: [] } };
        const vulns = sessionManager.currentSession.vulnerabilities || [];
        
        if (vulns.length === 0) {
            return '✅ No vulnerabilities detected yet. Run scans to discover issues.';
        }
        
        const critical = vulns.filter(v => v.severity === 'CRITICAL' || v.severity === 'high');
        const medium = vulns.filter(v => v.severity === 'MEDIUM' || v.severity === 'medium');
        const low = vulns.filter(v => v.severity === 'LOW' || v.severity === 'low');
        
        return `
⚠️  VULNERABILITY REPORT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL/HIGH: ${critical.length}
🟡 MEDIUM: ${medium.length}
🟢 LOW: ${low.length}

${critical.length > 0 ? '🔴 CRITICAL ISSUES:\n' + critical.map((v, i) => `  ${i+1}. ${v.type || v.description}`).join('\n') : ''}

${medium.length > 0 ? '\n🟡 MEDIUM ISSUES:\n' + medium.map((v, i) => `  ${i+1}. ${v.type || v.description}`).join('\n') : ''}

Total: ${vulns.length} vulnerability(ies) found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    },
    
    'sessions': async () => {
        try {
            const config = window.appConfig || window.CONFIG;
            const response = await fetch(`${config.KALI_MCP_ENDPOINT}/api/listener/list`);
            const data = await response.json();
            
            if (!data.listeners || data.listeners.length === 0) {
                return `
🎧 METASPLOIT SESSIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No active sessions.

Start a listener: listen 4444
Generate payload: payload windows`;
            }
            
            return `
🎧 ACTIVE METASPLOIT SESSIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.listeners.map((l, i) => `
  Session ${i+1}: ${l.platform}
  └─ ${l.lhost}:${l.lport} [${l.status}]
  └─ Started: ${new Date(l.started).toLocaleString()}`).join('\n')}

Total: ${data.listeners.length} active session(s)`;
        } catch (error) {
            return '⚠️  Unable to reach Metasploit server. Is it running?';
        }
    },
    
    'findings': () => {
        const sessionManager = window.sessionManager || { currentSession: { findings: [], scans: [] } };
        const findings = sessionManager.currentSession.findings || [];
        const scans = sessionManager.currentSession.scans || [];
        
        if (findings.length === 0 && scans.length === 0) {
            return '📊 No findings yet. Run some scans first!';
        }
        
        return `
📊 SESSION INTELLIGENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Scans Run: ${scans.length}
📝 Findings: ${findings.length}
⚠️  Vulnerabilities: ${sessionManager.currentSession.vulnerabilities?.length || 0}

Recent Findings:
${findings.slice(-5).map((f, i) => `
  ${i+1}. [${f.tool}] ${f.target}
     └─ ${f.result.substring(0, 100)}...`).join('\n')}

Full details: Check session export`;
    },
    
    'clear': () => {
        const terminal = document.getElementById('terminalOutput');
        if (terminal) {
            terminal.innerHTML = `
                <div class="terminal-line">
                    <span class="terminal-prompt">atom@ninja:~#</span>
                    <span class="terminal-text">Terminal cleared. Ready for operations.</span>
                </div>
                <div class="terminal-cursor">_</div>`;
        }
        return null; // Don't add another line
    },
    
    'payload': (platform = 'windows') => {
        return `
🔨 QUICK PAYLOAD GENERATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generating ${platform} payload...

💡 For full control, use Easy Mode:
   Visit: /metasploit-easy.html

Or use AI: "generate ${platform} payload for my IP"`;
    },
    
    'listen': (port = '4444') => {
        return `
🎧 STARTING LISTENER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port: ${port}
Status: Initializing...

💡 Use Easy Mode for auto-setup:
   Visit: /metasploit-easy.html
   
Or use AI: "start listener on port ${port}"`;
    },
    
    'exploit': (target) => {
        if (!target) {
            return '⚠️  Please specify target: exploit <target>';
        }
        
        return `
💣 EXPLOITATION CHAIN INITIATED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: ${target}

Phase 1: Reconnaissance...
Phase 2: Vulnerability Assessment...
Phase 3: Exploit Selection...
Phase 4: Payload Delivery...

💡 Let AI handle this: "exploit ${target}"`;
    }
};

// Quick scan commands
const quickScans = {
    'scan': (target) => {
        if (!target) return '⚠️  Specify target: scan <ip|domain>';
        return {
            command: 'scan',
            target: target,
            aiPrompt: `Perform comprehensive reconnaissance on ${target}. Start with nmap port scan, then identify services and technologies.`
        };
    },
    
    'ports': (target) => {
        if (!target) return '⚠️  Specify target: ports <ip>';
        return {
            command: 'nmap',
            target: target,
            aiPrompt: `Quick port scan on ${target}. Use nmap to find open ports.`
        };
    },
    
    'web': (url) => {
        if (!url) return '⚠️  Specify URL: web <url>';
        return {
            command: 'whatweb',
            target: url,
            aiPrompt: `Scan web application at ${url}. Identify technologies, then check for common vulnerabilities.`
        };
    },
    
    'dns': (domain) => {
        if (!domain) return '⚠️  Specify domain: dns <domain>';
        return {
            command: 'dig',
            target: domain,
            aiPrompt: `Perform DNS enumeration on ${domain}. Check records and find subdomains.`
        };
    },
    
    'subs': (domain) => {
        if (!domain) return '⚠️  Specify domain: subs <domain>';
        return {
            command: 'subfinder',
            target: domain,
            aiPrompt: `Find subdomains of ${domain} using multiple techniques.`
        };
    },
    
    'sqli': (url) => {
        if (!url) return '⚠️  Specify URL: sqli <url>';
        return {
            command: 'sqlmap',
            target: url,
            aiPrompt: `Test ${url} for SQL injection vulnerabilities using sqlmap.`
        };
    },
    
    'xss': (url) => {
        if (!url) return '⚠️  Specify URL: xss <url>';
        return {
            command: 'xss',
            target: url,
            aiPrompt: `Scan ${url} for XSS vulnerabilities. Test both reflected and stored XSS.`
        };
    },
    
    'brute': (target) => {
        if (!target) return '⚠️  Specify target: brute <target>';
        return {
            command: 'hydra',
            target: target,
            aiPrompt: `Attempt brute force on ${target}. Detect service and use appropriate wordlists.`
        };
    }
};

// Process quick commands
window.processQuickCommand = function(input) {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Check hacking commands first
    if (hackingCommands[cmd]) {
        const result = hackingCommands[cmd](...args);
        if (result) { // Only add line if result is not null
            if (typeof addTerminalLine === 'function') {
                addTerminalLine(result, 'success');
            }
            return true;
        }
        return true; // Command handled (like clear)
    }
    
    // Check quick scans
    if (quickScans[cmd]) {
        const result = quickScans[cmd](...args);
        if (typeof result === 'string') {
            if (typeof addTerminalLine === 'function') {
                addTerminalLine(result, 'error');
            }
            return true;
        }
        // If it returns an object, it needs AI processing
        return result;
    }
    
    return false; // Not a quick command
};

// Enhance execute button handler
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        const executeBtn = document.getElementById('executeBtn');
        const commandInput = document.getElementById('commandInput');
        
        if (executeBtn && commandInput) {
            // Enter key handler
            commandInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    executeBtn.click();
                }
            });
            
            // Enhanced execute handler
            const originalExecute = window.executeCommand;
            window.executeCommand = async function(command) {
                const input = command || commandInput.value.trim();
                if (!input) return;
                
                // Add user input to terminal
                if (typeof addTerminalLine === 'function') {
                    addTerminalLine(`> ${input}`, 'info');
                }
                
                // Try quick command first
                const quickResult = window.processQuickCommand(input);
                
                if (quickResult === true) {
                    // Command handled by quick commands
                    commandInput.value = '';
                    return;
                } else if (quickResult && typeof quickResult === 'object') {
                    // Quick scan command - route to AI
                    commandInput.value = '';
                    if (typeof addTerminalLine === 'function') {
                        addTerminalLine('🤖 Atom: Roger that, Chief. Processing...', 'text');
                    }
                    
                    // Send to AI with the generated prompt
                    if (typeof sendToAI === 'function') {
                        await sendToAI(quickResult.aiPrompt, quickResult.target);
                    }
                    return;
                }
                
                // Otherwise use original execute (AI processing)
                if (originalExecute) {
                    await originalExecute(input);
                } else {
                    // Fallback: send to AI
                    commandInput.value = '';
                    if (typeof addTerminalLine === 'function') {
                        addTerminalLine('🤖 Atom: Processing your request, Chief...', 'text');
                    }
                    
                    if (typeof sendToAI === 'function') {
                        await sendToAI(input);
                    }
                }
            };
        }
        
        // Welcome message enhancement
        setTimeout(() => {
            if (typeof addTerminalLine === 'function') {
                addTerminalLine('💡 Tip: Type "help" for hacking commands or just talk to Atom!', 'success');
            }
        }, 1000);
    });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        hackingCommands,
        quickScans,
        processQuickCommand
    };
}
