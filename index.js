const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. DUMMY WEB KEEPALIVE SERVER (Keeps Railway from timing out)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Core Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const mccFolder = path.join(__dirname, 'mcc_bin');
const mccExecutable = path.join(mccFolder, 'MinecraftClient');

// 2. REDIRECT-SAFE BINARY RETRIEVAL 
function downloadFile(url, dest, callback) {
    https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            return downloadFile(response.headers.location, dest, callback);
        }
        if (response.statusCode !== 200) {
            console.error(`Download failed with status: ${response.statusCode}`);
            process.exit(1);
        }
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => file.close(callback));
    }).on('error', (err) => {
        console.error(`Download Error: ${err.message}`);
        process.exit(1);
    });
}

function setupMCC() {
    if (fs.existsSync(mccExecutable)) {
        console.log("Verified: Native MCC binary present.");
        runMCC();
        return;
    }

    console.log("Initializing Minecraft Console Client (MCC) secure download...");
    fs.mkdirSync(mccFolder, { recursive: true });
    
    // Direct uncompressed stable Linux x64 mirror asset link
    const downloadUrl = 'https://githubusercontent.com';

    downloadFile(downloadUrl, mccExecutable, () => {
        console.log("Download complete. Optimizing host file execute permissions...");
        try {
            // Apply full execution flags so Linux safely launches the daemon binary file
            execSync(`chmod +x "${mccExecutable}"`);
            console.log("Environment optimization complete.");
            runMCC();
        } catch (e) {
            console.error("Permission error encountered:", e.message);
            process.exit(1);
        }
    });
}

// 3. SECURE BACKGROUND RUNTIME DAEMON
function runMCC() {
    console.log("Spawning native Minecraft Console Client daemon...");

    // Copy your configuration settings seamlessly straight into the execution sandbox path
    fs.copyFileSync(path.join(__dirname, 'MinecraftClient.ini'), path.join(mccFolder, 'MinecraftClient.ini'));
    fs.copyFileSync(path.join(__dirname, 'sample-script.txt'), path.join(mccFolder, 'sample-script.txt'));

    const child = spawn(`./MinecraftClient`, [], { 
        cwd: mccFolder,
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

// Initialize execution chain
setupMCC();
