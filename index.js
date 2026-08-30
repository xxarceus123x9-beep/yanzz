const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. WEB KEEPALIVE KICKSTARTER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Core Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const botFolder = path.join(__dirname, 'bot_runtime');
const botJar = path.join(botFolder, 'bot.jar');

function setupBot() {
    if (fs.existsSync(botJar)) {
        runBot();
        return;
    }

    console.log("Downloading native client runtime container layers...");
    fs.mkdirSync(botFolder, { recursive: true });

    // Link to the pre-packaged headless application jar file
    const downloadUrl = 'https://github.com';
    
    const file = fs.createWriteStream(botJar);
    https.get(downloadUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            return https.get(response.headers.location, (res2) => res2.pipe(file));
        }
        response.pipe(file);
    });

    file.on('finish', () => {
        file.close();
        console.log("Extraction clear. Assembling profiles...");
        runBot();
    });
}

function runBot() {
    console.log("Launching headless engine wrapper layers...");

    // Writing standard connection variables into the client properties
    const configContent = `server=cobbleguymon.aternos.me:26621\nname=brochacho\nversion=1.21.1\nonline-mode=false\nautocommands=/register chalol78 chalol78,/login chalol78`;
    fs.writeFileSync(path.join(botFolder, 'config.properties'), configContent);

    // Run the native headless jar package
    const child = spawn('java', ['-jar', 'bot.jar'], { 
        cwd: botFolder,
        stdio: 'inherit'
    });

    child.on('close', () => {
        setTimeout(runBot, 15000);
    });
}

setupBot();
