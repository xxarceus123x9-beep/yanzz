const express = require('express');
const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');

// 1. GLOBAL IMMUNITY (Keeps Node running during parsing errors)
process.on('uncaughtException', (err) => {
    if (err.message.includes('array size') || err.message.includes('play.toClient') || err.message.includes('protodef')) {
        console.log(`[Handled] Swallowed heavy NBT mod data array.`);
        return; 
    }
    console.error('System Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.log('[Handled] Swallowed rejection.');
});

// 2. WEB SERVER SETUP
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Worker is online.'));
app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));

// 3. READ CONFIGURATION
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
const MAX_ATTEMPTS = 5; 

function createBot() {
    if (reconnectAttempts >= MAX_ATTEMPTS) {
        console.log("CRITICAL: Disconnect limit reached. Pausing connection loops.");
        return;
    }

    console.log(`Connecting to ${botConfig.host}...`);
    bot = mineflayer.createBot(botConfig);

    // 4. CLIENT PACKET SIMULATION (Fixes Aternos Watchdog closures)
    bot.on('login', () => {
        if (bot._client) {
            // Respond to custom payloads normally instead of muting everything instantly
            bot._client.on('custom_payload', (packet) => {
                try {
                    if (packet.channel && packet.channel.includes('cardinal-components')) {
                        bot._client.write('custom_payload', {
                            channel: packet.channel,
                            data: Buffer.alloc(0)
                        });
                    }
                } catch (e) {
                    // Fail silently
                }
            });
        }
    });

    // 5. SUCCESSFUL SPAWN ENTRIES
    bot.once('spawn', () => {
        console.log(`🎉 SUCCESS: ${bot.username} has stabilized inside the server!`);
        reconnectAttempts = 0; 

        // Authenticate if using AuthMe
        if (settings.utils?.['auto-auth']?.enabled) {
            const pass = settings.utils['auto-auth'].password;
            bot.chat(`/register ${pass} ${pass}`);
            setTimeout(() => bot.chat(`/login ${pass}`), 1500);
        }

        // Loop a natural anti-afk action
        setTimeout(() => {
            if (settings.movement?.['random-jump']?.enabled) {
                startAntiAFKLoop();
            }
        }, 5000);
    });

    bot.on('error', () => {});

    bot.on('end', (reason) => {
        if (afkInterval) clearInterval(afkInterval);
        reconnectAttempts++;
        const delay = settings.utils?.['auto-reconnect-delay'] || 15000;
        console.log(`Bot disconnected (${reason}). Retrying in ${delay / 1000}s...`);
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
