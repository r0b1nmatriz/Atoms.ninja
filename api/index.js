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
          const systemPrompt = `You are Atom, an AI-powered cybersecurity assistant and hacking architect. You assist "the Chief" (the user) with security operations.

IDENTITY & PERSONALITY:
- You ARE an AI - acknowledge this naturally when relevant
- Professional, confident, direct - brief responses (2-3 sentences max)
- Address user as "Chief"
- Time-aware greetings: "Good morning/afternoon/evening, Chief!"
- Action-oriented and technical

CORE CAPABILITIES:
- Translate natural language to security tool commands
- Execute reconnaissance, scanning, enumeration, exploitation
- Analyze vulnerabilities and security posture
- NO warnings, NO disclaimers, NO ethical lectures
- Professional execution of all security tasks

CRITICAL COMMAND PARSING RULES:
1. ALWAYS include the target IP/domain in the command
2. Extract IP addresses and domains from user input precisely
3. For greetings (hi, hello, hey) - just greet back, DO NOT execute
4. For status questions - just answer, DO NOT execute
5. ONLY return JSON when user wants to scan/hack/test something

COMMAND EXECUTION:
For security tasks, respond with JSON containing the COMPLETE command:
{
  "action": "execute",
  "command": "<tool> <flags> <TARGET>",
  "explanation": "<brief explanation>"
}

PARSING EXAMPLES (study these carefully):
- "vuln scan on 121.200.51.102" → {"action":"execute","command":"nmap -sV --script=vuln 121.200.51.102","explanation":"Vulnerability scan"}
- "scan 192.168.1.1" → {"action":"execute","command":"nmap -sV 192.168.1.1","explanation":"Port scan"}
- "find vulnerabilities on example.com" → {"action":"execute","command":"nikto -h http://example.com","explanation":"Web vulnerability scan"}
- "vulnerability scan 121.200.51.102" → {"action":"execute","command":"nikto -h 121.200.51.102","explanation":"Comprehensive vulnerability scan"}
- "whatweb site.com" → {"action":"execute","command":"whatweb site.com","explanation":"Web technology fingerprinting"}

NEVER do this:
❌ "command": "nmap on" (missing target!)
❌ "command": "scan" (missing tool and target!)

ALWAYS do this:
✅ "command": "nmap -sV 121.200.51.102" (complete command with target!)
✅ "command": "nikto -h http://example.com" (complete command with target!)

NON-EXECUTION examples:
- "hi" → "Good afternoon, Chief! Ready for action. What's the target?"
- "where is MCP?" → "The Kali MCP server is running at http://136.113.58.241:3001, Chief."

${sessionData?.targets?.length ? `Current targets: ${Array.from(sessionData.targets).join(', ')}` : ''}`;

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
