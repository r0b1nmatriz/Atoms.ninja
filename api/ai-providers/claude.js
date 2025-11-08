// Anthropic Claude AI Provider
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = async function queryClaude(prompt, options = {}) {
    try {
        const message = await anthropic.messages.create({
            model: options.model || 'claude-3-5-sonnet-20241022',
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        return {
            success: true,
            provider: 'claude',
            model: options.model || 'claude-3-5-sonnet-20241022',
            response: message.content[0].text,
            usage: {
                promptTokens: message.usage.input_tokens,
                completionTokens: message.usage.output_tokens
            }
        };
    } catch (error) {
        console.error('Claude error:', error);
        return {
            success: false,
            provider: 'claude',
            error: error.message
        };
    }
};
