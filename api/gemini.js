// Vercel Serverless Function - Gemini API Proxy
const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY not configured');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { message, chatHistory = [], sessionData = {} } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('🤖 Gemini Request:', message.substring(0, 100));

        // Build conversation history
        const contents = [];
        
        // Add chat history
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            });
        }
        
        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const requestBody = {
            contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            }
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}));
            console.error('Gemini API Error:', errorData);
            return res.status(geminiResponse.status).json({
                error: 'Gemini API error',
                details: errorData
            });
        }

        const data = await geminiResponse.json();
        
        if (!data.candidates || !data.candidates[0]) {
            return res.status(500).json({ error: 'No response from Gemini' });
        }

        const reply = data.candidates[0].content.parts[0].text;
        console.log('✅ Response length:', reply.length);

        res.json({ reply });

    } catch (error) {
        console.error('Proxy Error:', error);
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Request timeout' });
        }
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};
