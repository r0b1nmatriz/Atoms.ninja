// Vercel Serverless Function - Health Check
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.json({
        status: 'healthy',
        service: 'Atoms Ninja Backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
};
