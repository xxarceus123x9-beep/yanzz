const express = require('express');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

// 1. WEB SERVER SETUP (Keeps Railway/Render online)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('AFK Bot Service is online and operational.');
});

app.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
});

// 2. READ CONFIGURATION FILE
const settingsPath = path.join(__dirname, 'settings.json');
let settings;

try {
    const rawData = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(rawData);
} catch (error) {
    console.error("Error reading settings.json file:", error.message);
    process.exit(1);
}

// 3. MINECRAFT BOT PROPERTIES
const botConfig = {
    host: settings.server.ip,
    port: parseInt(settings.server.port) || 25565,
    username: settings['bot-account']?.username || 'AFK_Bot',
    version: settings.server.version || false
};

let bot;
let afkInterval;
let reconnectAttempts = 0;
const MAX_ATTEMPTS = 5; // Safety cutoff to prevent spamming your Aternos server

function createBot() {
    if (reconnectAttempts >= MAX_ATTEMPTS) {
        console.log("CRITICAL: Bot kicked repeatedly. Stopping loop to prevent Aternos server shutdown.");
        return;
    }

    console.log(`Connecting to ${botConfig.host}:${botConfig.port} as ${botConfig.username}...`);
    bot = mineflayer.createBot(botConfig);

    // 4. MODDED SERVER SAFETY (Mutes Fabric/Cobblemon custom data streams to prevent crashes)
    bot.on('login', () => {
        if (bot._client) {
            bot._client.on('custom_payload', () => {
                return; // Safely drops custom mod payloads
            });
        }
    });

    // 5. BOT SPAWN ACTIONS
    bot.once('spawn', () => {
        console.log(`Success: ${bot.username} has spawned in the server.`);
        reconnectAttempts = 0; // Reset reconnection loop counter

        // Handles in-game authentication commands if enabled
        if (settings.utils?.['auto-auth']?.enabled) {
            const pass = settings.utils['auto-auth'].password;
            bot.chat(`/register ${pass} ${pass}`);
            setTimeout(() => {
                bot.chat(`/login ${pass}`);
            }, 1000);
        }

        // Safety Delay: Wait 3 seconds before moving to bypass anti-cheat filters
        setTimeout(() => {
            if (settings.movement?.['random-jump']?.enabled) {
                startAntiAFKLoop();
            }
        }, 3000);
    });

    // 6. CHAT LOGGER
    bot.on('chat', (username, message) => {
        if (settings.utils?.['chat-log']) {
            console.log(`[CHAT] <${username}> ${message}`);
        }
    });

    // 7. ERROR AND RECONNECT HANDLERS
    bot.on('error', (err) => {
        console.log(`Bot Error encountered: ${err.message}`);
    });

    bot.on('end', (reason) => {
        if (afkInterval) clearInterval(afkInterval);
        reconnectAttempts++;
        
        const delay = settings.utils?.['auto-reconnect-delay'] || 15000;
        console.log(`Bot disconnected (${reason}). Reconnecting (#${reconnectAttempts}) in ${delay / 1000} seconds...`);
        setTimeout(createBot, delay);
    });
}

// 8. ANTI-AFK ENGINE
function startAntiAFKLoop() {
    if (afkInterval) clearInterval(afkInterval);
    
    const intervalTime = settings.movement?.['random-jump']?.interval || 10000;
    console.log(`Anti-AFK active: Bot will jump every ${intervalTime / 1000} seconds.`);
    
    afkInterval = setInterval(() => {
        if (bot && bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 400);
        }
    }, intervalTime);
}

// Initialize execution
createBot();
