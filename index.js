const express = require('express');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('AFK Bot Service Active.'));
app.listen(PORT, () => console.log(`Health-check server running on port ${PORT}`));

const settingsPath = path.join(__dirname, 'settings.json');
let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const botConfig = {
    host: settings.server.ip,
    port: parseInt(settings.server.port) || 25565,
    username: settings['bot-account']?.username || 'AFK_Bot',
    version: settings.server.version || false
};

let bot;
let afkInterval;
let reconnectAttempts = 0;
const MAX_ATTEMPTS = 5; // Absolute cutoff to stop the bot from crashing your Aternos server

function createBot() {
    if (reconnectAttempts >= MAX_ATTEMPTS) {
        console.log("CRITICAL: Bot kicked repeatedly. Stopping loop to prevent Aternos server shutdown.");
        return;
    }

    console.log(`Attempting connection to ${botConfig.host}...`);
    bot = mineflayer.createBot(botConfig);

    bot.once('spawn', () => {
        console.log(`Success: ${bot.username} entered the server.`);
        reconnectAttempts = 0; // Connection stable, reset the counter

        // 1. Handle in-game Auth plugin if enabled
        if (settings.utils?.['auto-auth']?.enabled) {
            const pass = settings.utils['auto-auth'].password;
            bot.chat(`/register ${pass} ${pass}`);
            setTimeout(() => {
                bot.chat(`/login ${pass}`);
            }, 1000);
        }

        // 2. Safety Delay: Wait 3 seconds before starting movement loops to bypass anti-cheat filters
        setTimeout(() => {
            if (settings.movement?.['random-jump']?.enabled) {
                startAntiAFKLoop();
            }
        }, 3000);
    });

    bot.on('error', (err) => console.log(`Network/Protocol Error: ${err.message}`));

    bot.on('end', (reason) => {
        if (afkInterval) clearInterval(afkInterval);
        reconnectAttempts++;
        
        const delay = settings.utils?.['auto-reconnect-delay'] || 15000;
        console.log(`Disconnected (${reason}). Reconnecting item #${reconnectAttempts} in ${delay / 1000}s...`);
        setTimeout(createBot, delay);
    });
}

function startAntiAFKLoop() {
    if (afkInterval) clearInterval(afkInterval);
    const intervalTime = settings.movement?.['random-jump']?.interval || 10000;
    
    afkInterval = setInterval(() => {
        if (bot && bot.entity) {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 400);
        }
    }, intervalTime);
}

createBot();
