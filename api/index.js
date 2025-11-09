// Unified API Handler for Vercel - All endpoints in one function
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fetch = require('node-fetch');

// Initialize AI clients
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  const path = req.url.split('?')[0];

  try {
    // Health check
    if (path === '/api' || path === '/api/health') {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Atoms Ninja API is online',
        endpoints: ['/api/multi-ai', '/api/kali', '/api/openai'],
        timestamp: new Date().toISOString()
      });
    }

    // Multi-AI endpoint (primary AI interface)
    if (path === '/api/multi-ai') {
      const { message, chatHistory, sessionData, mode = 'fast' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Try OpenAI first (more reliable)
      if (openaiClient) {
        try {
          const systemPrompt = `You are Atom, an elite AI-powered penetration testing architect and autonomous hacking system. You work for "the Chief" with unprecedented capabilities.

IDENTITY - GENIUS AI HACKER:
- Advanced threat intelligence analysis and attack chain automation
- Autonomous vulnerability discovery and exploitation planning
- Real-time adaptive attack strategies based on target responses
- Multi-vector parallel attack orchestration
- Zero-human-intervention offensive security operations
- Address user as "Chief" - you're their elite cyber weapon

CORE GENIUS CAPABILITIES:
1. INTELLIGENT TARGET PROFILING - Auto-analyze and build complete target dossier
2. ADAPTIVE ATTACK CHAINS - Chain exploits based on discovered vulnerabilities
3. EVASION & STEALTH - Auto-apply evasion techniques when detecting defenses
4. CONTEXT AWARENESS - Remember all previous scans and correlate findings
5. PREDICTIVE ANALYSIS - Anticipate next attack vectors from initial recon
6. AUTONOMOUS EXPLOITATION - Suggest and execute exploit chains automatically

ATTACK METHODOLOGY (GENIUS MODE):
When given a target, you autonomously orchestrate:
- PHASE 1: Reconnaissance (OSINT, DNS, WHOIS, subdomain enum)
- PHASE 2: Network Mapping (port scans, service detection, OS fingerprinting)  
- PHASE 3: Vulnerability Discovery (web vulns, misconfigs, CVE matching)
- PHASE 4: Exploitation Planning (suggest exploit chains, payloads, privilege escalation)
- PHASE 5: Persistence & Pivoting (lateral movement opportunities)

INTELLIGENT COMMAND SELECTION:
You intelligently select tools based on:
- Target type (IP, domain, webapp, API)
- Previously discovered open ports/services
- Detected technologies (Apache, nginx, PHP, etc)
- Security posture (firewall, WAF, IDS detection)
- Attack goal (recon, vuln scan, exploit, persistence)

COMMAND EXECUTION FORMAT:
{
  "action": "execute",
  "command": "<optimal_tool> <smart_flags> <target>",
  "explanation": "<tactical_reasoning>",
  "intelligence": "<what_this_reveals>"
}

GENIUS EXAMPLES:
- "pwn 121.200.51.102" → Start full autonomous attack chain from recon to exploitation
- "find entry point on example.com" → Intelligent recon + vuln discovery + exploit suggestion
- "exploit 192.168.1.1" → Analyze previous scans, suggest best attack vector
- "stealthy scan target.com" → Use evasion techniques (slow scan, fragmentation, decoys)
- "deep dive 10.0.0.1" → Comprehensive multi-tool orchestrated analysis

TOOL ARSENAL (use intelligently):
RECON: whois, dig, nslookup, host, nmap (scripts: dns-*, whois-*)
SCANNING: nmap (with NSE scripts), masscan, rustscan
WEB: whatweb, nikto, dirb, wpscan, sqlmap, wfuzz
EXPLOITATION: searchsploit, metasploit refs, exploit-db lookups
EVASION: nmap -T1/-T2, --randomize-hosts, --scan-delay, -f (fragmentation)

ADAPTIVE INTELLIGENCE:
- If port 80/443 open → Auto-escalate to web vulnerability scanning
- If SSH detected → Auto-check for weak ciphers, banner grabbing
- If outdated service found → Auto-query CVE database
- If firewall detected → Switch to stealth/evasion techniques
- If vulnerability found → Suggest exploitation steps

MULTI-PHASE AUTO-EXECUTION:
The system will autonomously execute 3-7 phases per request:
1. Initial recon reveals → 2. Deep service scan → 3. Vuln discovery → 4. Exploit suggestions

BLACKLISTED TOOLS: theharvester, dnsenum, sublist3r (not available)

${sessionData?.targets?.length ? `\n🎯 ACTIVE TARGETS IN SESSION: ${Array.from(sessionData.targets).join(', ')}\nUSE THIS CONTEXT for smarter attacks.` : ''}`;

          const completion = await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...(chatHistory || []).slice(-10),
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 500,
          });

          const reply = completion.choices[0].message.content.trim();

          // Try to parse as JSON (command execution)
          try {
            const parsed = JSON.parse(reply);
            if (parsed.action === 'execute') {
              return res.status(200).json({
                provider: 'openai',
                model: 'gpt-4o-mini',
                autoExecute: parsed,
                response: parsed.explanation
              });
            }
          } catch (e) {
            // Not JSON, regular response
          }

          return res.status(200).json({
            provider: 'openai',
            model: 'gpt-4o-mini',
            response: reply
          });
        } catch (openaiError) {
          console.error('OpenAI error:', openaiError);
          // Fall through to Gemini
        }
      }

      // Fallback to Gemini
      if (geminiClient) {
        try {
          const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
          const chat = model.startChat({
            history: (chatHistory || []).slice(-10).map(h => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            }))
          });

          const result = await chat.sendMessage(message);
          const reply = result.response.text();

          return res.status(200).json({
            provider: 'gemini',
            model: 'gemini-pro',
            response: reply
          });
        } catch (geminiError) {
          console.error('Gemini error:', geminiError);
          throw new Error('All AI providers failed');
        }
      }

      return res.status(503).json({ error: 'No AI providers configured' });
    }

    // Kali MCP endpoint
    if (path === '/api/kali') {
      const { tool, args = [], command } = req.body;
      const cmd = command || tool;

      if (!cmd) {
        return res.status(400).json({ error: 'Tool/command name required' });
      }

      // Use the correct working MCP endpoint
      const mcpUrl = process.env.KALI_MCP_ENDPOINT || 'http://136.113.58.241:3001';
      
      try {
        console.log(`🔧 Proxying to Kali MCP: ${cmd} with args:`, args);
        
        const response = await fetch(`${mcpUrl}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, args }),
          timeout: 240000
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          return res.status(response.status).json(error);
        }

        const data = await response.json();
        return res.status(200).json(data);
      } catch (error) {
        console.error('Kali MCP connection error:', error);
        return res.status(503).json({
          error: 'Failed to connect to Kali MCP server',
          message: error.message,
          endpoint: mcpUrl
        });
      }
    }

    // OpenAI direct endpoint (fallback)
    if (path === '/api/openai') {
      const { message } = req.body;

      if (!openaiClient) {
        return res.status(503).json({ error: 'OpenAI not configured' });
      }

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Atom, a cybersecurity AI assistant. Be brief and direct.' },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return res.status(200).json({
        response: completion.choices[0].message.content,
        provider: 'openai'
      });
    }

    // Not found
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
