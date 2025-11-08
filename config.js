// Atoms Ninja - Configuration
const CONFIG = {
    // Backend API (Gemini Proxy) - Always use atoms.ninja
    BACKEND_API_URL: 'https://atoms.ninja/api',
    
    // Kali Linux MCP Server (GCP VM) - Always use atoms.ninja proxy
    KALI_MCP_ENDPOINT: 'https://atoms.ninja/api/kali',
    
    // GCP Configuration
    GCP: {
        PROJECT_ID: 'gen-lang-client-0528385692',
        VM_INSTANCE: 'atoms-kali-security',
        VM_IP: '136.113.58.241',
        REGION: 'us-central1'
    },
    
    // Service Accounts
    SERVICE_ACCOUNTS: {
        VERTEX_AI: 'gen-lang-client-0528385692-a54ea848daea.json',
        OWNER: 'gen-lang-client-0528385692-8f8d2551426e.json'
    },
    
    // API Keys
    GEMINI_API_KEY: 'AIzaSyDzGlemhn-AEP5G8F0UrHuD6gWr97RV0YQ'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
