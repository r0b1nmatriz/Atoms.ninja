// AI System Health Check Endpoint
import { healthCheck } from './ai-router.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🔍 Running AI health check...');
        const results = await healthCheck();
        
        // Count online providers
        let onlineCount = 0;
        let totalCount = 0;
        
        for (const tier in results) {
            for (const provider in results[tier]) {
                totalCount++;
                if (results[tier][provider].status === 'online') {
                    onlineCount++;
                }
            }
        }
        
        const healthPercentage = Math.round((onlineCount / totalCount) * 100);
        
        return res.status(200).json({
            status: healthPercentage >= 50 ? 'healthy' : 'degraded',
            healthPercentage,
            onlineProviders: onlineCount,
            totalProviders: totalCount,
            tiers: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        return res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
}
