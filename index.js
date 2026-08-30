const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 1. DUMMY WEB KEEPALIVE SERVER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Core Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const mccExecutable = path.join(__dirname, 'MinecraftClient');

function runMCC() {
    console.log("Checking environment configurations...");

    if (!fs.existsSync(mccExecutable)) {
        console.error("CRITICAL ERROR: MinecraftClient binary not found in root directory.");
        process.exit(1);
    }

    console.log("Optimizing host execute permissions...");
    try {
        execSync(`chmod +x "${mccExecutable}"`);
    } catch (e) {
        console.log("Permission system override skipped.");
    }

    console.log("Spawning native Minecraft Console Client daemon...");

    const child = spawn(`./MinecraftClient`, [], { 
        cwd: __dirname,
        stdio: 'inherit' // Pipes bot logging actions instantly to Railway console logs
    });

    child.on('error', (err) => {
        console.error("Fatal background process exception:", err);
    });

    child.on('close', (code) => {
        console.log(`Process exited with code (${code}). Auto-rebooting in 15 seconds...`);
        setTimeout(runMCC, 15000);
    });
}

runMCC();
