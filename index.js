const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 1. DUMMY WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Service Active.'));
app.listen(PORT, () => console.log(`Health platform online via port ${PORT}`));

const mccExecutable = path.join(__dirname, 'MinecraftClient');

function setupMCC() {
    if (fs.existsSync(mccExecutable)) {
        console.log("Verified: Native MCC binary present.");
        runMCC();
        return;
    }

    console.log("Running official MCC setup script installer...");
    try {
        // Uses the official installation framework directly inside Railway's runtime shell
        execSync('curl -fsSL https://mccteam.github.io/install.sh | sh', { cwd: __dirname });
        console.log("Official compilation payload deployed.");
        runMCC();
    } catch (err) {
        console.error("Critical failure during setup initialization:", err.message);
        process.exit(1);
    }
}

function runMCC() {
    console.log("Spawning native Minecraft Console Client daemon...");

    // Confirm execution parameters before passing control to sub-processes
    try { fs.chmodSync(mccExecutable, '755'); } catch(e){}

    const child = spawn('./MinecraftClient', [], { 
        cwd: __dirname,
        stdio: 'inherit' 
    });

    child.on('error', (err) => {
        console.error("Fatal background process exception:", err);
    });

    child.on('close', (code) => {
        console.log(`Process exited with code (${code}). Auto-rebooting in 15 seconds...`);
        setTimeout(runMCC, 15000);
    });
}

setupMCC();
