// OpenAI GPT Provider
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function queryOpenAI(prompt, options = {}) {
    try {
        const completion = await openai.chat.completions.create({
            model: options.model || 'gpt-4o',
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
            provider: 'openai',
            model: options.model || 'gpt-4o',
            response: completion.choices[0].message.content,
            usage: {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens
            }
        };
    } catch (error) {
        console.error('OpenAI error:', error);
        return {
            success: false,
            provider: 'openai',
            error: error.message
        };
    }
};
