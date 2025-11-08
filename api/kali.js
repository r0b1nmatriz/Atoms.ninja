// Vercel Serverless Function - Kali MCP Proxy
const fetch = require('node-fetch');

const KALI_MCP_ENDPOINT = process.env.KALI_MCP_ENDPOINT || 'http://136.113.58.241:3001';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { tool, args = [] } = req.body;
        
        if (!tool) {
            return res.status(400).json({ error: 'Tool name is required' });
        }

        console.log(`🔧 Proxying to Kali MCP: ${tool} with args:`, args);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        
        const kaliResponse = await fetch(`${KALI_MCP_ENDPOINT}/api/tools/${tool}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tool: tool,
                args: args 
            }),
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
            return res.status(504).json({ error: 'Request timeout' });
        }
        res.status(500).json({ error: error.message });
    }
};
