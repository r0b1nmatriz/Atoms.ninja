// Groq (Fast Open Source Models)
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

module.exports = async function queryGroq(prompt, options = {}) {
    try {
        const completion = await groq.chat.completions.create({
            model: options.model || 'llama-3.1-70b-versatile',
            messages: [{
                role: 'system',
                content: options.systemPrompt || 'You are Atom, an elite cybersecurity AI assistant.'
            }, {
                role: 'user',
                content: prompt
            }],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
        });

        return {
            success: true,
            provider: 'groq',
            model: options.model || 'llama-3.1-70b-versatile',
            response: completion.choices[0].message.content,
            usage: {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens
            }
        };
    } catch (error) {
        console.error('Groq error:', error);
        return {
            success: false,
            provider: 'groq',
            error: error.message
        };
    }
};
