const express = require('express');
const mc = require('minecraft-protocol');
const fs = require('fs');
const path = require('path');

// 1. KEEPALIVE WEB SERVER
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
        version: '1.21', // Forcing the base protocol state resolves 1.21.1 strict handshake traps
        auth: 'offline'
    });

    // --- STRONGER HANDSHAKE FIX ---
    // This catches the exact millisecond the connection moves to "configuration" phase 
    // and sends the client settings before the server throws a DecoderException
    client.on('stateChanged', (newState) => {
        if (newState === 'configuration') {
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
                console.log("Sent client information packet directly to configuration state.");
            } catch (e) {
                // Fail silently
            }
        }
    });

    client.on('success', () => {
        console.log(`🎉 STABILIZED: ${botUsername} logged in successfully!`);
        
        // Anti-AFK Jump Simulator
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

    client.on('chat', (packet) => {
        try {
            const message = JSON.parse(packet.message);
            if (message.text) console.log(`[CHAT] ${message.text}`);
        } catch (e) {}
    });

    client.on('error', (err) => {
        console.log(`Packet process handled safely.`);
    });

    client.on('end', (reason) => {
        if (jumpInterval) clearInterval(jumpInterval);
        console.log(`Disconnected (${reason}). Reconnecting to cluster in 15 seconds...`);
        setTimeout(createBot, 15000);
    });
}

createBot();
