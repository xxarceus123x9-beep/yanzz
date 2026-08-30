const { execSync, spawn } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 1. DUMMY WEB KEEPALIVE (Satisfies Railway network policies)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('MCC Background Sync Active.'));
app.listen(PORT, () => console.log(`Railway Health Server online via port ${PORT}`));

const mccFolder = path.join(__dirname, 'mcc_bin');
const mccExecutable = path.join(mccFolder, 'MinecraftClient');

// 2. RUNTIME DOWNLOAD AND EXTRACTION ENGINE
function setupMCC() {
    if (fs.existsSync(mccExecutable)) {
        console.log("MCC engine already present. Proceeding to execution...");
        return;
    }

    console.log("Initializing Minecraft Console Client (MCC) secure download...");
    fs.mkdirSync(mccFolder, { recursive: true });

    try {
        // Pull down the verified stable binary package for Linux
        const downloadUrl = 'https://github.com';
        const zipPath = path.join(mccFolder, 'mcc.zip');

        console.log("Fetching binary packages...");
        execSync(`curl -L "${downloadUrl}" -o "${zipPath}"`);

        console.log("Extracting binary dependencies...");
        execSync(`unzip -o "${zipPath}" -d "${mccFolder}"`);
        
        console.log("Cleaning cache files...");
        fs.unlinkSync(zipPath);

        // Crucial step: Give Linux permission to execute the headless client app
        execSync(`chmod +x "${mccExecutable}"`);
        console.log("Environment optimization complete.");
    } catch (err) {
        console.error("Critical failure preparing host binary wrappers:", err.message);
        process.exit(1);
    }
}

// 3. SECURE DAEMON EXECUTION
function runMCC() {
    console.log("Spawning runtime console client process tree...");
    
    // Copy configurations straight over to the execution sandbox path
    fs.copyFileSync(path.join(__dirname, 'MinecraftClient.ini'), path.join(mccFolder, 'MinecraftClient.ini'));
    fs.copyFileSync(path.join(__dirname, 'sample-script.txt'), path.join(mccFolder, 'sample-script.txt'));

    const child = spawn(`./MinecraftClient`, [], { 
        cwd: mccFolder,
        stdio: 'inherit' // Automatically forwards MCC logs directly to your Railway log panel!
    });

    child.on('error', (err) => {
        console.error("Fatal exception during process branch operations:", err);
    });

    child.on('close', (code) => {
        console.log(`Process exited with system code (${code}). Rebooting service branch in 15s...`);
        setTimeout(runMCC, 15000);
    });
}

// Initialize Pipeline Actions sequentially
setupMCC();
runMCC();
