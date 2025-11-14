#!/usr/bin/env node
/**
 * Kali Linux Cybersecurity Tools MCP Server
 * Provides MCP interface for common Kali Linux security tools
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.KALI_MCP_PORT || 3001;

// CORS configuration - allow all origins for now
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Tool execution wrapper
async function executeTool(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 30000;
    
    // Determine if command needs sudo based on tool and flags
    const isMacOS = process.platform === 'darwin';
    
    // Commands that always need sudo
    const alwaysSudoTools = ['masscan', 'tcpdump', 'aircrack-ng', 'hping3'];
    
    // Check if nmap has privileged flags
    const nmapPrivilegedFlags = ['-O', '-sS', '-sU', '-sA', '-sW', '-sM', '--osscan-guess', '--traceroute'];
    const needsNmapSudo = command === 'nmap' && args.some(arg => nmapPrivilegedFlags.includes(arg));
    
    const needsSudo = !isMacOS && (alwaysSudoTools.includes(command) || needsNmapSudo);
    const actualCommand = needsSudo ? 'sudo' : command;
    const actualArgs = needsSudo ? [command, ...args] : args;
    
    console.log(`🔧 Executing: ${actualCommand} ${actualArgs.join(' ')} (sudo: ${needsSudo})`);
    
    const childProcess = spawn(actualCommand, actualArgs, {
      shell: false,
      env: { ...process.env, ...options.env }
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      childProcess.kill();
      reject(new Error('Command execution timeout'));
    }, timeout);

    childProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    childProcess.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kali-mcp-server', timestamp: new Date().toISOString() });
});

// Network scanning tools
app.post('/api/tools/nmap', async (req, res) => {
  try {
    const { target, options = '-sV' } = req.body;
    if (!target) return res.status(400).json({ error: 'Target required' });
    
    // Split options string into array of arguments
    const optionsArray = typeof options === 'string' ? options.split(/\s+/).filter(Boolean) : options;
    const result = await executeTool('nmap', [...optionsArray, target], { timeout: 120000 });
    res.json({ tool: 'nmap', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/masscan', async (req, res) => {
  try {
    const { target, ports = '1-65535', rate = '1000' } = req.body;
    if (!target) return res.status(400).json({ error: 'Target required' });
    
    const result = await executeTool('masscan', [target, '-p', ports, '--rate', rate], { timeout: 60000 });
    res.json({ tool: 'masscan', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vulnerability scanning
app.post('/api/tools/nikto', async (req, res) => {
  try {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: 'Target required' });
    
    const result = await executeTool('nikto', ['-h', target], { timeout: 300000 });
    res.json({ tool: 'nikto', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web application testing
app.post('/api/tools/sqlmap', async (req, res) => {
  try {
    const { url, options = '--batch --crawl=2' } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    const result = await executeTool('sqlmap', ['-u', url, ...options.split(' ')], { timeout: 300000 });
    res.json({ tool: 'sqlmap', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/dirb', async (req, res) => {
  try {
    const { url, wordlist = '/usr/share/wordlists/dirb/common.txt' } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    const result = await executeTool('dirb', [url, wordlist], { timeout: 120000 });
    res.json({ tool: 'dirb', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exploitation frameworks
app.post('/api/tools/metasploit', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });
    
    const result = await executeTool('msfconsole', ['-q', '-x', command], { timeout: 300000 });
    res.json({ tool: 'metasploit', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Msfvenom payload generation
app.post('/api/tools/msfvenom', async (req, res) => {
  try {
    const { payload, lhost, lport, format = 'exe', encoder, iterations = 1, output } = req.body;
    if (!payload || !lhost || !lport) {
      return res.status(400).json({ error: 'Payload, LHOST, and LPORT required' });
    }
    
    const args = [
      '-p', payload,
      `LHOST=${lhost}`,
      `LPORT=${lport}`,
      '-f', format
    ];
    
    if (encoder) {
      args.push('-e', encoder);
      args.push('-i', iterations.toString());
    }
    
    if (output) {
      args.push('-o', output);
    }
    
    const result = await executeTool('msfvenom', args, { timeout: 120000 });
    res.json({ 
      tool: 'msfvenom', 
      result: result.stdout, 
      stderr: result.stderr,
      output: output 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metasploit listener management
app.post('/api/tools/msf-handler', async (req, res) => {
  try {
    const { handler = 'exploit/multi/handler', payload, lhost, lport, action = 'start' } = req.body;
    
    if (action === 'start') {
      if (!payload || !lhost || !lport) {
        return res.status(400).json({ error: 'Payload, LHOST, and LPORT required' });
      }
      
      const msfCommand = `use ${handler}; set PAYLOAD ${payload}; set LHOST ${lhost}; set LPORT ${lport}; set ExitOnSession false; exploit -j -z`;
      
      const result = await executeTool('msfconsole', ['-q', '-x', msfCommand], { timeout: 60000 });
      res.json({ 
        tool: 'msf-handler',
        action: 'start',
        result: result.stdout,
        stderr: result.stderr 
      });
    } else if (action === 'sessions') {
      const result = await executeTool('msfconsole', ['-q', '-x', 'sessions -l; exit'], { timeout: 30000 });
      res.json({ 
        tool: 'msf-handler',
        action: 'sessions',
        result: result.stdout 
      });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Searchsploit integration
app.post('/api/tools/searchsploit', async (req, res) => {
  try {
    const { query, options = '' } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query required' });
    
    const args = options ? options.split(' ').concat([query]) : [query];
    const result = await executeTool('searchsploit', args, { timeout: 60000 });
    res.json({ tool: 'searchsploit', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wireless tools
app.post('/api/tools/aircrack', async (req, res) => {
  try {
    const { capFile, wordlist = '/usr/share/wordlists/rockyou.txt' } = req.body;
    if (!capFile) return res.status(400).json({ error: 'Capture file required' });
    
    const result = await executeTool('aircrack-ng', [capFile, '-w', wordlist], { timeout: 300000 });
    res.json({ tool: 'aircrack-ng', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Network analysis
app.post('/api/tools/wireshark', async (req, res) => {
  try {
    const { pcapFile, filter = '' } = req.body;
    if (!pcapFile) return res.status(400).json({ error: 'PCAP file required' });
    
    const args = filter ? ['-r', pcapFile, '-Y', filter] : ['-r', pcapFile];
    const result = await executeTool('tshark', args, { timeout: 60000 });
    res.json({ tool: 'tshark', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Information gathering
app.post('/api/tools/whois', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    
    const result = await executeTool('whois', [domain], { timeout: 30000 });
    res.json({ tool: 'whois', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/dig', async (req, res) => {
  try {
    const { domain, type = 'ANY' } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    
    const result = await executeTool('dig', [domain, type], { timeout: 30000 });
    res.json({ tool: 'dig', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/theHarvester', async (req, res) => {
  try {
    const { domain, source = 'all' } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    
    const result = await executeTool('theHarvester', ['-d', domain, '-b', source], { timeout: 120000 });
    res.json({ tool: 'theHarvester', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Password cracking
app.post('/api/tools/john', async (req, res) => {
  try {
    const { hashFile, wordlist = '/usr/share/wordlists/rockyou.txt', format } = req.body;
    if (!hashFile) return res.status(400).json({ error: 'Hash file required' });
    
    const args = [hashFile];
    if (wordlist) args.push(`--wordlist=${wordlist}`);
    if (format) args.push(`--format=${format}`);
    
    const result = await executeTool('john', args, { timeout: 300000 });
    res.json({ tool: 'john', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/hydra', async (req, res) => {
  try {
    const { target, service = 'ssh', username, passwordList } = req.body;
    if (!target || !username) return res.status(400).json({ error: 'Target and username required' });
    
    const pwList = passwordList || '/usr/share/wordlists/rockyou.txt';
    const result = await executeTool('hydra', ['-l', username, '-P', pwList, target, service], { timeout: 300000 });
    res.json({ tool: 'hydra', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wireless attacks
app.post('/api/tools/aircrack', async (req, res) => {
  try {
    const { capFile, wordlist = '/usr/share/wordlists/rockyou.txt', bssid } = req.body;
    if (!capFile) return res.status(400).json({ error: 'Capture file required' });
    
    const args = ['-w', wordlist, capFile];
    if (bssid) args.push('-b', bssid);
    
    const result = await executeTool('aircrack-ng', args, { timeout: 600000 });
    res.json({ tool: 'aircrack-ng', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Network analysis
app.post('/api/tools/tcpdump', async (req, res) => {
  try {
    const { interface: iface = 'eth0', filter = '', count = 100 } = req.body;
    
    const args = ['-i', iface, '-c', count.toString()];
    if (filter) args.push(filter);
    
    const result = await executeTool('tcpdump', args, { timeout: 120000 });
    res.json({ tool: 'tcpdump', result: result.stdout, stderr: result.stderr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// General command execution with AI assistance
app.post('/api/execute', async (req, res) => {
  try {
    const { command, args = [] } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });
    
    // Whitelist of allowed commands for security
    const allowedCommands = [
      'nmap', 'masscan', 'nikto', 'sqlmap', 'dirb', 'gobuster',
      'john', 'hydra', 'hashcat', 'medusa',
      'aircrack-ng', 'tcpdump', 'wireshark',
      'whois', 'dig', 'host', 'nslookup',
      'whatweb', 'wpscan', 'searchsploit',
      'curl', 'wget', 'netcat', 'nc', 'hping3',
      'wfuzz', 'ffuf', 'dirsearch',
      'msfvenom', 'msfconsole', 'msfdb'
    ];
    
    if (!allowedCommands.includes(command)) {
      return res.status(403).json({ error: 'Command not allowed' });
    }
    
    // Set response timeout to 5 minutes
    res.setTimeout(300000);
    
    // Different timeouts for different tools
    const toolTimeouts = {
      'searchsploit': 60000,
      'nmap': 180000,
      'dirb': 180000,
      'sqlmap': 300000,
      'nikto': 300000,
      'wpscan': 180000,
      'hydra': 300000,
      'default': 120000
    };
    
    const timeout = toolTimeouts[command] || toolTimeouts.default;
    
    const result = await executeTool(command, args, { timeout });
    res.json({ command, result: result.stdout, stderr: result.stderr, exitCode: result.code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List available tools
app.get('/api/tools', (req, res) => {
  res.json({
    categories: {
      network_scanning: ['nmap', 'masscan', 'hping3', 'zmap'],
      vulnerability_scanning: ['nikto', 'nmap with scripts', 'sslscan'],
      web_testing: ['sqlmap', 'dirb', 'gobuster', 'wfuzz', 'curl', 'wget'],
      password_cracking: ['john', 'hydra'],
      wireless: ['aircrack-ng'],
      exploitation: ['metasploit', 'msfconsole', 'msfvenom'],
      network_analysis: ['tcpdump', 'wireshark', 'netcat'],
      information_gathering: ['whois', 'dig', 'host', 'nslookup', 'theHarvester', 'amass', 'sublist3r'],
      osint: ['amass', 'sublist3r', 'theHarvester', 'whois'],
      programming: ['python3', 'ruby', 'go', 'node']
    },
    installed: {
      languages: ['Python 3.9.2', 'Ruby 2.7.4', 'Go 1.15.15', 'Node.js 18.20.8'],
      tools: [
        'nmap 7.80', 'hydra 9.1', 'aircrack-ng', 'masscan',
        'sqlmap 1.9', 'nikto 2.5', 'gobuster', 'dirb',
        'sslscan 2.0.7', 'amass 4.2.0', 'sublist3r',
        'metasploit-framework', 'tcpdump', 'whois', 'dig'
      ]
    }
  });
});

app.listen(PORT, () => {
  console.log(`🛡️  Kali MCP Server running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}`);
  console.log(`⚡ Health check: http://localhost:${PORT}/health`);
});
