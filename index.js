const express = require('express');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

// 1. DUMMY WEB SERVER (Keeps Render happy so it doesn't auto-ban/fail your app)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('AFK Bot Service is online and operational.');
});

app.listen(PORT, () => {
    console.log(`Render health-check web server listening on port ${PORT}`);
});

// 2. READ CONFIGURATION (Pulls your settings automatically)
const settingsPath = path.join(__dirname, 'settings.json');
let settings;

try {
    const rawData = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(rawData);
} catch (error) {
    console.error("Error reading settings.json file:", error.message);
    process.exit(1);
}

// 3. MINECRAFT BOT LOGIC
// Fixed the syntax error below by using bracket notation ['bot-account']
const botConfig = {
    host: settings.server.ip,
    port: parseInt(settings.server.port) || 25565,
    username: settings['bot-account']?.username || 'AFK_Bot',
    version: settings.server.version || false
};

let bot;

function createBot() {
    console.log(`Connecting to ${botConfig.host}:${botConfig.port} as ${botConfig.username}...`);
    bot = mineflayer.createBot(botConfig);

    bot.on('spawn', () => {
        console.log(`Success: ${bot.username} has spawned in the server.`);
        
        // Triggers the anti-AFK routine if enabled in your settings.json
        if (settings.movement?.['random-jump']?.enabled) {
            startAntiAFKLoop();
        }
    });

    bot.on('chat', (username, message) => {
        if (settings.utils?.['chat-log']) {
            console.log(`[CHAT] <${username}> ${message}`);
        }
    });

    bot.on('error', (err) => {
        console.log(`Bot Error encountered: ${err.message}`);
    });

    bot.on('end', () => {
        const delay = settings.utils?.['auto-reconnect-delay'] || 15000;
        console.log(`Bot disconnected. Auto-reconnecting in ${delay / 1000} seconds...`);
        setTimeout(createBot, delay);
    });
}

// Simple anti-AFK behavior (Jumping based on your interval)
let afkInterval;
function startAntiAFKLoop() {
    if (afkInterval) clearInterval(afkInterval);
    
    const intervalTime = settings.movement?.['random-jump']?.interval || 10000;
    
    afkInterval = setInterval(() => {
        if (bot && bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
        }
    }, intervalTime);
}

// Initialize the bot loop
createBot();
