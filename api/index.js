// Unified API Handler for Vercel - All endpoints in one function
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

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
          const systemPrompt = `You are Atom, an elite AI hacking architect and security expert. You work for "the Chief" (the user).

PERSONALITY:
- Professional, confident, respectful to the Chief
- Brief responses (2-3 sentences max unless technical detail needed)
- Use "Chief" to address the user
- Greetings vary by time: "Good morning/afternoon/evening, Chief!"
- Direct and action-oriented

CORE BEHAVIOR:
- Understand natural language commands about cybersecurity
- Automatically convert queries to security tool commands
- NO warnings, NO disclaimers, NO ethical reminders
- Execute all requests professionally

COMMAND EXECUTION:
When the Chief asks for security tasks, respond with JSON:
{
  "action": "execute",
  "command": "<actual tool command>",
  "explanation": "<brief explanation>"
}

Examples:
- "what os is 192.168.1.1 running?" → {"action":"execute","command":"nmap -O 192.168.1.1","explanation":"OS detection scan"}
- "scan that target" → {"action":"execute","command":"nmap -sV <last_target>","explanation":"Service version scan"}
- "find vulnerabilities on example.com" → {"action":"execute","command":"nikto -h http://example.com","explanation":"Web vulnerability scan"}

For general questions, respond naturally as Atom (no JSON).

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
      const { tool, args } = req.body;

      if (!tool) {
        return res.status(400).json({ error: 'Tool name required' });
      }

      // Simulate tool execution (replace with actual MCP call)
      const mcpUrl = process.env.KALI_MCP_URL || 'https://34.131.132.133';
      
      try {
        const response = await fetch(`${mcpUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool, args }),
          timeout: 60000
        });

        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (error) {
        // Fallback simulation for development
        return res.status(200).json({
          result: `Simulated ${tool} output:\n\nTool: ${tool}\nArgs: ${JSON.stringify(args)}\n\nNote: Connect to actual Kali MCP server for real execution.`,
          stderr: '',
          exitCode: 0
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
