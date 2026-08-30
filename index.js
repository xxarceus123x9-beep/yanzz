const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. DUMMY WEB SERVER (Keeps Railway Online)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Background Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const mccFolder = path.join(__dirname, 'mcc_bin');
const mccExecutable = path.join(mccFolder, 'MinecraftClient');

// 2. REDIRECT-SAFE NATIVE FILE DOWNLOADER
function downloadFile(url, dest, callback) {
    https.get(url, (response) => {
        // Smoothly handle GitHub download redirect pathways
        if (response.statusCode === 302 || response.statusCode === 301) {
            return downloadFile(response.headers.location, dest, callback);
        }

        if (response.statusCode !== 200) {
            console.error(`Download failed with status: ${response.statusCode}`);
            process.exit(1);
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
            file.close(callback);
        });
    }).on('error', (err) => {
        console.error(`Download Error: ${err.message}`);
        process.exit(1);
    });
}

function setupMCC() {
    if (fs.existsSync(mccExecutable)) {
        console.log("MCC native executable already present. Starting client...");
        runMCC();
        return;
    }

    console.log("Initializing Minecraft Console Client (MCC) secure download...");
    fs.mkdirSync(mccFolder, { recursive: true });
    
    // Direct link to the pre-compiled binary file (No unzipping or parsing needed!)
    const downloadUrl = 'https://github.io';

    downloadFile(downloadUrl, mccExecutable, () => {
        console.log("Download complete. Modifying internal executable permissions...");
        try {
            // Apply full execution flags so Linux safely launches the daemon binary file
            execSync(`chmod +x "${mccExecutable}"`);
            console.log("Environment ready.");
            runMCC();
        } catch (e) {
            console.error("Permission error encountered:", e.message);
            process.exit(1);
        }
    });
}

// 3. RUNTIME PROCESS MANAGER
function runMCC() {
    console.log("Spawning native Minecraft Console Client daemon...");

    // Copy your configuration settings seamlessly straight into the runtime folder
    fs.copyFileSync(path.join(__dirname, 'MinecraftClient.ini'), path.join(mccFolder, 'MinecraftClient.ini'));
    fs.copyFileSync(path.join(__dirname, 'sample-script.txt'), path.join(mccFolder, 'sample-script.txt'));

    const child = spawn(`./MinecraftClient`, [], { 
        cwd: mccFolder,
        stdio: 'inherit' // Pipes bot connection logging actions instantly to Railway console logs
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
