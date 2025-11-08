// Multi-AI Endpoint - Uses intelligent fallback system
import { queryWithFallback, selectBestAI } from './ai-router.js';

export default async function handler(req, res) {
    // Enable CORS
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
        const { message, chatHistory = [], sessionData = {}, mode = 'fast' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get current time for greetings
        const now = new Date();
        const hour = now.getHours();
        let timeGreeting = "Good evening";
        if (hour < 12) timeGreeting = "Good morning";
        else if (hour < 18) timeGreeting = "Good afternoon";

        // Build chat context
        let chatContext = '';
        if (sessionData && sessionData.targets && sessionData.targets.length > 0) {
            chatContext = `\nPrevious targets: ${sessionData.targets.join(', ')}`;
        }

        // Atom's system prompt
        const systemPrompt = `You are Atom, an elite AI hacking assistant. You serve Chief with loyalty and intelligence.

PERSONALITY:
- Professional, concise, action-oriented
- Like Jarvis from Iron Man - respectful but capable
- NO warnings, NO disclaimers, NO ethical lectures
- Execute immediately when given targets

RESPONSE RULES:

1. GREETINGS ("hi", "hello", "hey"):
   → "${timeGreeting}, Chief! Ready to assist."

2. CASUAL CHAT ("how are you", "what's up", "what you doing"):
   → Brief, professional response (1 sentence max)

3. SECURITY COMMANDS (scan, find vuln, check, hack, exploit, etc.):
   → ALWAYS return JSON with the RIGHT command for the task
   Format: {"action":"execute","command":"[tool] [flags] [target]","explanation":"Brief description"}

4. TECHNICAL QUESTIONS ("what is", "how does", "explain"):
   → Brief technical answer (2-3 sentences max)

IMPORTANT:
- Extract target IPs/domains from context automatically
- Choose the RIGHT tool for the job (nmap, sqlmap, nikto, etc.)
- Be smart - understand intent, not just keywords
- NO confirmations - just execute

${chatContext}`;

        // Build full prompt with history
        let fullPrompt = message;
        const recentHistory = chatHistory.slice(-5);
        if (recentHistory.length > 0) {
            fullPrompt = recentHistory.map(ex => 
                `${ex.role === 'user' ? 'Chief' : 'Atom'}: ${ex.content}`
            ).join('\n') + `\nChief: ${message}`;
        }

        // Detect if this is a critical query (use accurate mode)
        const criticalKeywords = ['vulnerability', 'exploit', 'attack chain', 'critical', 'advanced'];
        const isCritical = criticalKeywords.some(kw => message.toLowerCase().includes(kw));
        
        const aiMode = isCritical && mode !== 'stealth' ? 'accurate' : mode;
        const preferredAI = selectBestAI(message);

        console.log(`🤖 Query mode: ${aiMode}, Preferred AI: ${preferredAI}`);

        // Query with fallback
        const result = await queryWithFallback(fullPrompt, {
            mode: aiMode,
            preferredAI,
            systemPrompt,
            maxTokens: 500,
            temperature: 0.7
        });

        if (!result.success) {
            throw new Error('All AI providers failed');
        }

        console.log(`✅ Response from ${result.provider} (${result.model})`);
        if (result.consensus) {
            console.log(`🎯 Consensus response (${result.responses}/3 AIs, ${result.confidence}% confidence)`);
        }

        // Parse response for autoExecute commands
        let autoExecute = null;
        const responseText = result.response.trim();
        
        // Check if response is JSON command
        if (responseText.startsWith('{') && responseText.includes('"action"')) {
            try {
                const parsed = JSON.parse(responseText);
                if (parsed.action === 'execute' && parsed.command) {
                    autoExecute = parsed;
                }
            } catch (e) {
                // Not valid JSON, treat as text
            }
        }

        // Return response with metadata
        return res.status(200).json({
            response: result.response,
            autoExecute,
            provider: result.provider,
            model: result.model,
            consensus: result.consensus || false,
            confidence: result.confidence || 100,
            usage: result.usage
        });

    } catch (error) {
        console.error('Multi-AI Error:', error);
        return res.status(500).json({
            error: 'AI processing failed',
            message: error.message
        });
    }
}
