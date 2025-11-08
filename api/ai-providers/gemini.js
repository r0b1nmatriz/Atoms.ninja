// Google Gemini AI Provider
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function queryGemini(prompt, options = {}) {
    try {
        const model = genAI.getGenerativeModel({ 
            model: options.model || 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 2000,
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            success: true,
            provider: 'gemini',
            model: options.model || 'gemini-2.0-flash-exp',
            response: text,
            usage: {
                promptTokens: result.promptTokenCount || 0,
                completionTokens: result.totalTokenCount || 0
            }
        };
    } catch (error) {
        console.error('Gemini error:', error);
        return {
            success: false,
            provider: 'gemini',
            error: error.message
        };
    }
};
