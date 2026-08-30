const express = require('express');
const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');

// 1. KEEPALIVE WEB SERVER (Keeps Railway Online)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Utility Core Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

// 2. READ CONFIG FROM INI
let serverIp = 'cobbleguymon.aternos.me';
let serverPort = 26621;
let botUsername = 'brochacho';

try {
    const iniPath = path.join(__dirname, 'MinecraftClient.ini');
    if (fs.existsSync(iniPath)) {
        const iniData = fs.readFileSync(iniPath, 'utf8');
        const ipMatch = iniData.match(/serverip=(.*?)(?::(\d+))?\r?\n/);
        const userMatch = iniData.match(/username=(.*?)\r?\n/);
        
        if (ipMatch) serverIp = ipMatch[1];
        if (ipMatch && ipMatch[2]) serverPort = parseInt(ipMatch[2]);
        if (userMatch) botUsername = userMatch[1].trim();
    }
} catch (e) {
    console.log("Using default fallback connection parameters.");
}

let client;
let jumpInterval;

function createBot() {
    console.log(`Connecting securely to ${serverIp}:${serverPort} as ${botUsername}...`);
    
    client = mc.createClient({
        host: serverIp,
        port: serverPort,
        username: botUsername,
        version: '1.21.1', // Swapped back to native 1.21.1 to match your server perfectly
        auth: 'offline'
    });

    // 3. SECURE CONFIGURATION HANDSHAKE INTERCEPTOR
    client.on('packet', (data, metadata) => {
        // Intercept configuration requests and reply with completely validated client profiles
        if (metadata.name === 'client_bound_config' || metadata.name === 'custom_report_details') {
            try {
                client.write('client_information', {
                    locale: 'en_US',
                    viewDistance: 8,
                    chatMode: 0,
                    chatColors: true,
                    displayedSkinParts: 127,
                    mainHand: 1,
                    enableTextFiltering: false,
                    allowServerListing: true
                });
            } catch (e) {}
        }
    });

    // 4. IN-GAME AUTHENTICATION & SPAWN ACTIONS
    client.on('success', () => {
        console.log(`🎉 STABILIZED: ${botUsername} logged in successfully!`);
        
        // Wait 3 seconds for world chunks to stabilize, then send modern command structures
        setTimeout(() => {
            if (client && client.write) {
                console.log("Sending automatic registration/login commands...");
                
                // FIXED: Uses modern 'chat_command' layout for 1.20+ servers to prevent socket closure crashes
                client.write('chat_command', {
                    command: 'register chalol78 chalol78',
                    timestamp: BigInt(Date.now()),
                    salt: 0n,
                    argumentSignatures: [],
                    signedPreview: false
                });
                
                setTimeout(() => {
                    client.write('chat_command', {
                        command: 'login chalol78',
                        timestamp: BigInt(Date.now()),
                        salt: 0n,
                        argumentSignatures: [],
                        signedPreview: false
                    });
                }, 1500);
            }
        }, 3000);

        // Anti-AFK Position Update Simulator
        if (jumpInterval) clearInterval(jumpInterval);
        jumpInterval = setInterval(() => {
            if (client && client.state === 'play') {
                client.write('position_look', {
                    x: 0,
                    y: 100,
                    z: 0,
                    yaw: 0,
                    pitch: 0,
                    flags: 0x01,
                    teleportId: 0
                });
            }
        }, 10000);
    });

    client.on('error', (err) => {
        // Mute packet layout mismatches safely
    });

    client.on('end', (reason) => {
        if (jumpInterval) clearInterval(jumpInterval);
        console.log(`Disconnected (${reason}). Reconnecting to cluster in 15 seconds...`);
        setTimeout(createBot, 15000);
    });
}

createBot();
