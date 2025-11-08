// Gemini Proxy Server for API Key Authentication
// Production-ready backend for Atoms Ninja

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Your Gemini API Key - MUST be set in environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY environment variable is not set!');
    console.error('Please set it in your .env file or environment');
    process.exit(1);
}

// CORS configuration for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:8000', 
        'http://localhost:3000', 
        'http://127.0.0.1:8000',
        'https://atoms-ninja.vercel.app',
        'https://atoms-ninja-frontend-hargxextq-achuashwin98-4594s-projects.vercel.app'
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        // Allow if origin is in the list or if wildcard is set
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            // For development/testing - log rejected origins
            console.log('⚠️  CORS blocked origin:', origin);
            callback(null, true); // Allow anyway for now
        }
    },
    methods: ['POST', 'OPTIONS', 'GET', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Atoms Ninja Gemini Proxy' });
});

// Gemini API endpoint with service account
app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt, temperature = 0.8, maxTokens = 300 } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Call Gemini API with API Key - using latest model
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens,
                        topP: 0.95,
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Gemini API Error:', error);
            return res.status(response.status).json({ 
                error: error.error?.message || 'Gemini API request failed' 
            });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

// Rate limiting middleware (optional but recommended)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Kali MCP Proxy - Route HTTPS requests to HTTP Kali server
app.post('/api/kali/tools/:tool', async (req, res) => {
    try {
        const { tool } = req.params;
        console.log(`🔧 Proxying to Kali MCP: ${tool}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        
        const kaliResponse = await fetch(`http://136.113.58.241:3001/api/tools/${tool}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!kaliResponse.ok) {
            const error = await kaliResponse.json().catch(() => ({ error: 'Unknown error' }));
            return res.status(kaliResponse.status).json(error);
        }
        
        const data = await kaliResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Kali MCP Proxy Error:', error);
        if (error.name === 'AbortError') {
            res.status(504).json({ error: 'Request timeout' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Kali MCP general proxy - accepts { tool, args }
app.post('/api/kali', async (req, res) => {
    try {
        const { tool, args } = req.body;
        console.log(`⚡ Proxying to Kali MCP: ${tool} with args:`, args);
        
        // Set a longer timeout for the response
        res.setTimeout(300000); // 5 minutes
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 240000); // 4 min timeout
        
        const kaliResponse = await fetch(`http://136.113.58.241:3001/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, args }),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!kaliResponse.ok) {
            const error = await kaliResponse.json().catch(() => ({ error: 'Unknown error' }));
            return res.status(kaliResponse.status).json(error);
        }
        
        const data = await kaliResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Kali MCP Proxy Error:', error);
        if (error.name === 'AbortError') {
            res.status(504).json({ error: 'Request timeout - tool took too long to execute' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Kali MCP general execute proxy (legacy)
app.post('/api/kali/execute', async (req, res) => {
    try {
        console.log(`⚡ Proxying execute to Kali MCP:`, req.body.command, req.body.args);
        
        // Set a longer timeout for the response
        res.setTimeout(300000); // 5 minutes
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 240000); // 4 min timeout
        
        const kaliResponse = await fetch(`http://136.113.58.241:3001/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!kaliResponse.ok) {
            const error = await kaliResponse.json().catch(() => ({ error: 'Unknown error' }));
            return res.status(kaliResponse.status).json(error);
        }
        
        const data = await kaliResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Kali MCP Execute Proxy Error:', error);
        if (error.name === 'AbortError') {
            res.status(504).json({ error: 'Request timeout - tool took too long to execute' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Kali MCP tools list proxy
app.get('/api/kali/tools', async (req, res) => {
    try {
        const kaliResponse = await fetch(`http://136.113.58.241:3001/api/tools`);
        const data = await kaliResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Kali MCP Tools List Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Atoms Ninja Gemini Proxy Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Gemini endpoint: http://localhost:${PORT}/api/gemini`);
    console.log(`🔧 Kali MCP Proxy: http://localhost:${PORT}/api/kali/*`);
});

module.exports = app;
