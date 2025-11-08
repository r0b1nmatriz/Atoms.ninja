// Multi-AI Router with Fallback & Consensus
const queryOpenAI = require('./ai-providers/openai');
const queryGemini = require('./ai-providers/gemini');
const queryClaude = require('./ai-providers/claude');
const queryGroq = require('./ai-providers/groq');

// AI Provider Tiers
const AI_TIERS = {
    tier1: [
        { name: 'openai', fn: queryOpenAI, model: 'gpt-4o' },
        { name: 'gemini', fn: queryGemini, model: 'gemini-2.0-flash-exp' },
        { name: 'claude', fn: queryClaude, model: 'claude-3-5-sonnet-20241022' }
    ],
    tier2: [
        { name: 'openai', fn: queryOpenAI, model: 'gpt-4-turbo' },
        { name: 'gemini', fn: queryGemini, model: 'gemini-1.5-pro' },
        { name: 'claude', fn: queryClaude, model: 'claude-3-opus-20240229' }
    ],
    tier3: [
        { name: 'openai', fn: queryOpenAI, model: 'gpt-3.5-turbo' },
        { name: 'gemini', fn: queryGemini, model: 'gemini-1.5-flash' },
        { name: 'groq', fn: queryGroq, model: 'llama-3.1-70b-versatile' }
    ]
};

// Smart routing based on query type
function selectBestAI(query) {
    const q = query.toLowerCase();
    
    if (q.includes('explain') || q.includes('describe') || q.includes('how does')) {
        return 'claude'; // Best at explanations
    }
    if (q.includes('scan') || q.includes('quick') || q.includes('fast')) {
        return 'gemini'; // Fastest
    }
    if (q.includes('vulnerability') || q.includes('cve') || q.includes('exploit')) {
        return 'openai'; // Best security knowledge
    }
    if (q.includes('attack chain') || q.includes('critical') || q.includes('advanced')) {
        return 'consensus'; // Use all 3
    }
    
    return 'openai'; // Default
}

// Execute query with fallback
async function queryWithFallback(prompt, options = {}) {
    const mode = options.mode || 'fast'; // fast | accurate | stealth
    const preferredAI = options.preferredAI || selectBestAI(prompt);
    
    if (mode === 'accurate' || preferredAI === 'consensus') {
        return await queryWithConsensus(prompt, options);
    }
    
    // Try Tier 1
    for (const ai of AI_TIERS.tier1) {
        if (preferredAI !== 'auto' && ai.name !== preferredAI) continue;
        
        console.log(`🤖 Trying ${ai.name} (${ai.model})...`);
        const result = await ai.fn(prompt, { ...options, model: ai.model });
        
        if (result.success) {
            console.log(`✅ ${ai.name} responded successfully`);
            return result;
        }
        console.log(`❌ ${ai.name} failed: ${result.error}`);
    }
    
    // Fallback to Tier 2
    console.log('⚠️  Tier 1 failed, trying Tier 2...');
    for (const ai of AI_TIERS.tier2) {
        const result = await ai.fn(prompt, { ...options, model: ai.model });
        if (result.success) {
            console.log(`✅ ${ai.name} (backup) responded`);
            return result;
        }
    }
    
    // Final fallback to Tier 3
    console.log('⚠️  Tier 2 failed, trying Tier 3...');
    for (const ai of AI_TIERS.tier3) {
        const result = await ai.fn(prompt, { ...options, model: ai.model });
        if (result.success) {
            console.log(`✅ ${ai.name} (final fallback) responded`);
            return result;
        }
    }
    
    throw new Error('All AI providers failed');
}

// Query multiple AIs and use consensus
async function queryWithConsensus(prompt, options = {}) {
    console.log('🎯 Using ACCURATE MODE - querying all Tier 1 AIs...');
    
    const promises = AI_TIERS.tier1.map(ai => 
        ai.fn(prompt, { ...options, model: ai.model })
            .catch(err => ({ success: false, provider: ai.name, error: err.message }))
    );
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
        console.log('❌ All Tier 1 AIs failed, falling back...');
        return await queryWithFallback(prompt, { ...options, mode: 'fast' });
    }
    
    console.log(`✅ ${successful.length}/3 AIs responded`);
    
    // Use the longest/most detailed response as primary
    const bestResponse = successful.sort((a, b) => 
        b.response.length - a.response.length
    )[0];
    
    return {
        ...bestResponse,
        consensus: true,
        responses: successful.length,
        confidence: Math.round((successful.length / 3) * 100)
    };
}

// Health check for all providers
async function healthCheck() {
    const testPrompt = "Reply with just 'OK'";
    const results = {};
    
    for (const tier in AI_TIERS) {
        results[tier] = {};
        for (const ai of AI_TIERS[tier]) {
            const start = Date.now();
            const result = await ai.fn(testPrompt, { model: ai.model, maxTokens: 10 });
            results[tier][ai.name] = {
                status: result.success ? 'online' : 'offline',
                latency: Date.now() - start,
                model: ai.model
            };
        }
    }
    
    return results;
}

module.exports = {
    queryWithFallback,
    queryWithConsensus,
    healthCheck,
    selectBestAI
};
