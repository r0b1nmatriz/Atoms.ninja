// GitHub Copilot Pro Integration
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = async (req, res) => {
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
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        console.log(`🤖 Asking GitHub Copilot Pro: ${query}`);
        
        // Create a script that captures Copilot's suggestion
        const script = `
            set timeout 45
            spawn github-copilot-cli what-the-shell "${query.replace(/"/g, '\\"')}"
            
            expect {
                "✅ Run this command" {
                    send "\\r"
                    exp_continue
                }
                -re "nmap|nikto|sqlmap|dirb|hydra|metasploit|wireshark|whatweb|masscan|gobuster|ffuf|wpscan|john|hashcat|burpsuite|zaproxy" {
                    set command $expect_out(0,string)
                    expect eof
                    puts "COPILOT_COMMAND:$command"
                }
                timeout {
                    puts "COPILOT_TIMEOUT"
                    exit 1
                }
            }
        `;
        
        // Execute via gcloud SSH with expect
        const sshCommand = `gcloud compute ssh atoms-kali-security --zone=us-central1-a --command="expect -c '${script.replace(/'/g, "'\\''")}'"`;
        
        const { stdout, stderr } = await execPromise(sshCommand, {
            timeout: 60000,
            maxBuffer: 1024 * 1024
        });
        
        // Parse the output
        const commandMatch = stdout.match(/COPILOT_COMMAND:([^\n]+)/);
        let command = '';
        let explanation = '';
        
        if (commandMatch) {
            command = commandMatch[1].trim();
        } else {
            // Fallback: extract any security tool command
            const toolMatch = stdout.match(/(nmap|nikto|sqlmap|dirb|hydra|metasploit|wireshark|whatweb|masscan)[^\n]+/i);
            if (toolMatch) {
                command = toolMatch[0].trim();
            }
        }
        
        // Extract explanation if present
        const explMatch = stdout.match(/Explanation[^\n]*\n([^\n]+)/i);
        if (explMatch) {
            explanation = explMatch[1].trim();
        }
        
        if (!command) {
            return res.status(500).json({ 
                error: 'Could not parse Copilot response',
                raw: stdout,
                stderr: stderr
            });
        }
        
        console.log(`✅ GitHub Copilot suggests: ${command}`);
        
        res.json({
            success: true,
            command: command,
            explanation: explanation || 'Suggested by GitHub Copilot Pro',
            autoExecute: {
                action: 'execute',
                command: command,
                explanation: explanation || 'GitHub Copilot Pro suggestion'
            },
            source: 'github-copilot-pro'
        });
        
    } catch (error) {
        console.error('GitHub Copilot Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stderr || error.stdout
        });
    }
};
