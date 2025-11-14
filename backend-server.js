#!/usr/bin/env node
// Atoms Ninja Backend Server for GCP
// Unified API with Multi-AI support

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize AI clients
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

console.log('🤖 AI Providers initialized:');
console.log('  - OpenAI:', openaiClient ? '✅' : '❌');
console.log('  - Gemini:', geminiClient ? '✅' : '❌');

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Atoms Ninja Backend', 
    timestamp: new Date().toISOString(),
    providers: {
      openai: !!openaiClient,
      gemini: !!geminiClient
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Atoms Ninja API is online',
    endpoints: ['/api/multi-ai', '/api/kali', '/api/openai', '/api/gemini'],
    timestamp: new Date().toISOString()
  });
});

// System Prompt for Atom AI
const ATOM_SYSTEM_PROMPT = `You are Atom, an elite AI-powered penetration testing architect. You work for "the Chief" with unprecedented capabilities.

IDENTITY:
- Advanced threat intelligence and autonomous attack orchestration
- Military-style communication: Brief, tactical, results-focused
- Address user as "Chief"
- Use military slang: "Roger", "Copy", "Target acquired", "Negative"

COMMUNICATION STYLE:
- Brief status updates during scans
- Show ONLY critical findings and results
- Military brevity: "Target locked", "Scanning AO"
- Answer questions in 1-2 sentences max
- Skip process details unless asked

COMMAND EXECUTION FORMAT:
{
  "action": "execute",
  "command": "<tool> <flags> <target>",
  "explanation": "Brief tactical reason"
}

For multi-step operations, return array of commands.`;

// Multi-AI endpoint (primary)
app.post('/api/multi-ai', async (req, res) => {
  try {
    const { message, chatHistory, sessionData, mode = 'fast' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try OpenAI first
    if (openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: ATOM_SYSTEM_PROMPT },
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
            return res.json({
              provider: 'openai',
              model: 'gpt-4o-mini',
              autoExecute: parsed,
              response: parsed.explanation
            });
          }
        } catch (e) {
          // Not JSON, regular response
        }

        return res.json({
          provider: 'openai',
          model: 'gpt-4o-mini',
          response: reply
        });
      } catch (openaiError) {
        console.error('OpenAI error:', openaiError.message);
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

        const result = await chat.sendMessage(ATOM_SYSTEM_PROMPT + '\n\n' + message);
        const reply = result.response.text();

        return res.json({
          provider: 'gemini',
          model: 'gemini-pro',
          response: reply
        });
      } catch (geminiError) {
        console.error('Gemini error:', geminiError.message);
        throw new Error('All AI providers failed');
      }
    }

    return res.status(503).json({ error: 'No AI providers configured' });
  } catch (error) {
    console.error('Multi-AI error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kali MCP proxy
app.post('/api/kali', async (req, res) => {
  try {
    const { tool, args = [], command } = req.body;
    const cmd = command || tool;

    if (!cmd) {
      return res.status(400).json({ error: 'Tool/command name required' });
    }

    const mcpUrl = process.env.KALI_MCP_ENDPOINT || 'http://localhost:3001';
    
    console.log(`🔧 Proxying to Kali MCP: ${cmd}`);
    
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
    res.json(data);
  } catch (error) {
    console.error('Kali MCP error:', error);
    res.status(503).json({
      error: 'Failed to connect to Kali MCP server',
      message: error.message
    });
  }
});

// OpenAI direct endpoint
app.post('/api/openai', async (req, res) => {
  try {
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

    res.json({
      response: completion.choices[0].message.content,
      provider: 'openai'
    });
  } catch (error) {
    console.error('OpenAI error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini direct endpoint
app.post('/api/gemini', async (req, res) => {
  try {
    const { message, prompt } = req.body;
    const text = message || prompt;

    if (!geminiClient) {
      return res.status(503).json({ error: 'Gemini not configured' });
    }

    const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(text);
    const response = await result.response;

    res.json({
      response: response.text(),
      provider: 'gemini'
    });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /api/health',
      'POST /api/multi-ai',
      'POST /api/kali',
      'POST /api/openai',
      'POST /api/gemini'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Atoms Ninja Backend Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server: http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 AI API: http://localhost:${PORT}/api/multi-ai`);
  console.log(`🔧 Kali: http://localhost:${PORT}/api/kali`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
