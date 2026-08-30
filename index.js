const { spawn, execSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

// 1. DUMMY WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Background Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const mccExecutable = path.join(__dirname, 'MinecraftClient');
const zipPath = path.join(__dirname, 'mcc.zip');

// 2. REDIRECT-SAFE HTTPS FILE DOWNLOADER
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

    console.log("Initializing Minecraft Console Client (MCC) native download...");
    
    // Using the accurate, official Linux compilation archive file link
    const downloadUrl = 'https://github.com';

    downloadFile(downloadUrl, zipPath, () => {
        console.log("Download complete. Extracting zip archive via native library wrapper...");
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(__dirname, true);
            
            // Delete raw downloaded zip to free up space
            fs.unlinkSync(zipPath);
            
            // Give Linux full core permission flags to launch the program binary file
            execSync(`chmod +x "${mccExecutable}"`);
            console.log("Environment ready.");
            runMCC();
        } catch (e) {
            console.error("Extraction error encountered:", e.message);
            process.exit(1);
        }
    });
}

// 3. RUNTIME PROCESS MANAGER
function runMCC() {
    console.log("Spawning native Minecraft Console Client daemon...");

    const child = spawn(mccExecutable, [], { 
        cwd: __dirname,
        stdio: 'inherit' // Pipes bot connection events directly to the Railway console
    });

    child.on('error', (err) => {
        console.error("Fatal background process exception:", err);
    });

    child.on('close', (code) => {
        console.log(`Process exited with code (${code}). Auto-rebooting in 15 seconds...`);
        setTimeout(runMCC, 15000);
    });
}

// Execute workflow sequentially
setupMCC();
