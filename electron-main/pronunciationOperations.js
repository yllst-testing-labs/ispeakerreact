import { ipcMain } from "electron";
import { exec } from "node:child_process";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { getSaveFolder, readUserSettings } from "./filePath.js";

let currentPythonProcess = null;

const checkPythonInstalled = async () => {
    let log = "";
    return new Promise((resolve) => {
        exec("python3 --version", (err, stdout, stderr) => {
            log += "> python3 --version\n" + stdout + stderr + "\n";
            if (!err && stdout) {
                resolve({
                    found: true,
                    version: stdout.trim(),
                    stderr: stderr.trim(),
                    log: log.trim(),
                });
            } else {
                exec("python --version", (err2, stdout2, stderr2) => {
                    log += "> python --version\n" + stdout2 + stderr2 + "\n";
                    if (!err2 && stdout2) {
                        resolve({
                            found: true,
                            version: stdout2.trim(),
                            stderr: stderr2.trim(),
                            log: log.trim(),
                        });
                    } else {
                        resolve({
                            found: false,
                            version: null,
                            stderr: (stderr2 || stderr || "").trim(),
                            log: log.trim(),
                        });
                    }
                });
            }
        });
    });
};

const dependencies = ["numpy", "torch", "torchaudio", "transformers", "huggingface_hub"];

const installDependencies = () => {
    ipcMain.handle("pronunciation-install-deps", async (event) => {
        let log = "";
        const depResults = [];

        for (const dep of dependencies) {
            // Notify renderer: this dep is pending
            event.sender.send("pronunciation-dep-progress", { name: dep, status: "pending" });

            // Install the dependency
            await new Promise((resolve) => {
                exec(`python -m pip install ${dep}`, (err, stdout, stderr) => {
                    log += `> python -m pip install ${dep}\n${stdout}${stderr}\n`;
                    const status = err ? "error" : "success";
                    depResults.push({ name: dep, status });
                    // Notify renderer: this dep is done
                    event.sender.send("pronunciation-dep-progress", {
                        name: dep,
                        status,
                        log: log.trim(),
                    });
                    resolve();
                });
            });
        }
        return { deps: depResults, log };
    });
};

// Extracted model download logic
const downloadModelToDir = async (modelDir, onProgress) => {
    // Ensure modelDir exists
    try {
        await fsPromises.access(modelDir);
    } catch {
        await fsPromises.mkdir(modelDir, { recursive: true });
    }
    // Write Python code to temp file in save folder
    const pyCode = `
import os, sys, json
try:
    from huggingface_hub import snapshot_download
except ImportError:
    print(json.dumps({"status": "error", "message": "huggingface_hub not installed"}))
    sys.exit(1)
model_dir = r'''${modelDir}'''
model_file = os.path.join(model_dir, "model.safetensors")
if not os.path.exists(model_file):
    print(json.dumps({"status": "downloading", "message": "Starting model download..."}))
    try:
        snapshot_download(repo_id="vitouphy/wav2vec2-xls-r-300m-timit-phoneme", local_dir=model_dir, ignore_patterns=["*.bin"])
        print(json.dumps({"status": "downloading", "message": "Model download complete."}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Download failed: {str(e)}"}))
        sys.exit(1)
else:
    print(json.dumps({"status": "found", "message": "Model loaded from local directory."}))
`;
    const saveFolder = await getSaveFolder(readUserSettings);
    const tempPyPath = path.join(saveFolder, "download_model_temp.py");
    await fsPromises.writeFile(tempPyPath, pyCode, "utf-8");
    // Emit 'downloading' status before launching Python process
    if (onProgress) onProgress({ status: "downloading", message: "Preparing to download model..." });
    return new Promise((resolve) => {
        const py = exec(`python -u "${tempPyPath}"`);
        currentPythonProcess = py;
        let lastStatus = null;
        let hadError = false;
        py.stdout.on("data", (data) => {
            const str = data.toString();
            // Always forward raw output to renderer for logging
            if (onProgress) onProgress({ status: "log", message: str });
            // Try to parse JSON lines as before
            str.split(/\r?\n/).forEach((line) => {
                if (line.trim()) {
                    try {
                        const msg = JSON.parse(line);
                        lastStatus = msg;
                        if (msg.status === "error") {
                            hadError = true;
                            if (onProgress) onProgress(msg);
                        } else {
                            if (onProgress) onProgress(msg);
                        }
                    } catch {
                        // Ignore parse errors for non-JSON lines
                    }
                }
            });
        });
        py.stderr.on("data", (data) => {
            // Only log stderr, do not send error status unless process exits with error
            if (onProgress) onProgress({ status: "log", message: data.toString() });
        });
        py.on("exit", (code) => {
            currentPythonProcess = null;
            fsPromises.unlink(tempPyPath).catch(() => {
                console.log("Failed to delete temp file");
            });
            // If process exited with error and no JSON error was sent, send a generic error
            if (code !== 0 && !hadError) {
                if (onProgress) onProgress({ status: "error", message: `Model download process exited with code ${code}` });
                resolve({ status: "error", message: `Model download process exited with code ${code}` });
            } else {
                resolve(lastStatus);
            }
        });
    });
};

const downloadModel = () => {
    ipcMain.handle("pronunciation-download-model", async (event) => {
        const saveFolder = await getSaveFolder(readUserSettings);
        const modelDir = path.join(saveFolder, "phoneme-model");
        // Forward progress to renderer
        const finalStatus = await downloadModelToDir(modelDir, (msg) => {
            event.sender.send("pronunciation-model-progress", msg);
        });
        // Return summary to renderer
        return finalStatus;
    });
};

const cancelProcess = () => {
    // IPC handler to cancel running Python process
    ipcMain.handle("pronunciation-cancel-process", (event) => {
        if (currentPythonProcess) {
            currentPythonProcess.kill();
            currentPythonProcess = null;
        }
        // Send confirmation to renderer
        event.sender.send("pronunciation-cancelled");
        console.log("Pronunciation process cancelled");
    });
};

export { cancelProcess, checkPythonInstalled, downloadModel, installDependencies };
