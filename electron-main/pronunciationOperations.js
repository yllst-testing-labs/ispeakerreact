import { ipcMain } from "electron";
import { Conf } from "electron-conf/main";
import fkill from "fkill";
import { spawn } from "node:child_process";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { getSaveFolder, readUserSettings } from "./filePath.js";

let currentPythonProcess = null;
let pendingCancel = false;
let isGloballyCancelled = false;

// Singleton instance for pronunciation install status
const installConf = new Conf({ name: "pronunciation-install" });

const checkPythonInstalled = async () => {
    let log = "";
    return new Promise((resolve) => {
        // Try python3 first
        const tryPython = (cmd, cb) => {
            const proc = spawn(cmd, ["--version"], { shell: true });
            let stdout = "";
            let stderr = "";
            proc.stdout.on("data", (data) => {
                stdout += data.toString();
            });
            proc.stderr.on("data", (data) => {
                stderr += data.toString();
            });
            proc.on("close", (code) => {
                cb(code, stdout, stderr);
            });
        };
        tryPython("python3", (err, stdout, stderr) => {
            log += "> python3 --version\n" + stdout + stderr + "\n";
            if (!err && stdout) {
                resolve({
                    found: true,
                    version: stdout.trim(),
                    stderr: stderr.trim(),
                    log: log.trim(),
                });
            } else {
                tryPython("python", (err2, stdout2, stderr2) => {
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

const startProcess = (cmd, args, onExit) => {
    const proc = spawn(cmd, args, { shell: true });
    currentPythonProcess = proc;
    if (pendingCancel) {
        // Wait 0.5s, then kill the process
        setTimeout(() => {
            fkill(proc.pid, { force: true, tree: true })
                .then(() => {
                    console.log("[Cancel] Process killed after short delay due to pending cancel.");
                })
                .catch((err) => {
                    if (err.message && err.message.includes("Process doesn't exist")) {
                        // Already dead, ignore
                    } else {
                        console.error("[Cancel] Error killing process after delay:", err);
                    }
                });
            proc._wasCancelledImmediately = true; // Mark for downstream logic
        }, 500); // 0.5 second delay
        pendingCancel = false;
    }
    proc.on("close", (code) => {
        onExit && onExit(code !== 0 ? { code } : null);
    });
    return proc;
};

const dependencies = ["numpy", "torch", "torchaudio", "transformers", "huggingface_hub[hf_xet]"];

const resetGlobalCancel = () => {
    isGloballyCancelled = false;
};

const installDependencies = () => {
    ipcMain.handle("pronunciation-install-deps", async (event) => {
        if (isGloballyCancelled) {
            return { deps: [{ name: "all", status: "cancelled" }], log: "" };
        }
        let log = "";
        event.sender.send("pronunciation-dep-progress", { name: "all", status: "pending" });
        return new Promise((resolve) => {
            const pipArgs = ["-m", "pip", "install", ...dependencies];
            const pipProcess = startProcess("python", pipArgs, (err) => {
                const status = err ? "error" : "success";
                event.sender.send("pronunciation-dep-progress", {
                    name: "all",
                    status,
                    log: log.trim(),
                });

                resolve({ deps: [{ name: "all", status }], log });
            });
            pipProcess.stdout.on("data", (data) => {
                log += data.toString();
                event.sender.send("pronunciation-dep-progress", {
                    name: "all",
                    status: "pending",
                    log: log.trim(),
                });
            });
            pipProcess.stderr.on("data", (data) => {
                log += data.toString();
                event.sender.send("pronunciation-dep-progress", {
                    name: "all",
                    status: "pending",
                    log: log.trim(),
                });
            });
        });
    });
};

// Extracted model download logic
const downloadModelToDir = async (modelDir, onProgress) => {
    if (isGloballyCancelled) {
        if (onProgress) onProgress({ status: "cancelled", message: "Cancelled before start" });
        return { status: "cancelled", message: "Cancelled before start" };
    }
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
    if (onProgress)
        onProgress({ status: "downloading", message: "Preparing to download model..." });
    return new Promise((resolve) => {
        const py = startProcess("python", ["-u", tempPyPath], (err) => {
            currentPythonProcess = null;
            fsPromises.unlink(tempPyPath).catch(() => {
                console.log("Failed to delete temp file");
            });
            if (err) {
                if (onProgress)
                    onProgress({
                        status: "error",
                        message: `Model download process exited with code ${err.code}`,
                    });
                resolve({
                    status: "error",
                    message: `Model download process exited with code ${err.code}`,
                });
            } else {
                if (onProgress)
                    onProgress({ status: "success", message: "Model download complete." });
                resolve({ status: "success", message: "Model download complete." });
            }
        });
        // If process was cancelled immediately, resolve and do not proceed
        if (py._wasCancelledImmediately) {
            if (onProgress)
                onProgress({ status: "cancelled", message: "Process cancelled before start" });
            resolve({ status: "cancelled", message: "Process cancelled before start" });
            return;
        }
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
                if (onProgress)
                    onProgress({
                        status: "error",
                        message: `Model download process exited with code ${code}`,
                    });
                resolve({
                    status: "error",
                    message: `Model download process exited with code ${code}`,
                });
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
    ipcMain.handle("pronunciation-cancel-process", async (event) => {
        isGloballyCancelled = true;
        console.log(
            "[Cancel] Cancellation requested. currentPythonProcess:",
            currentPythonProcess ? "exists" : "null"
        );
        if (currentPythonProcess) {
            try {
                await fkill(currentPythonProcess.pid, { force: true, tree: true });
                console.log("[Cancel] Python process tree killed with fkill.");
            } catch (err) {
                console.error("[Cancel] Error killing Python process tree:", err);
            }
            currentPythonProcess = null;
        } else {
            console.log("[Cancel] No Python process to kill. Setting pendingCancel flag.");
            pendingCancel = true;
        }
        event.sender.send("pronunciation-cancelled");
        console.log("[Cancel] Pronunciation process cancelled (event sent to renderer)");
    });
};

// Add a function to kill the current Python process (for app quit cleanup)
const killCurrentPythonProcess = async () => {
    if (currentPythonProcess) {
        try {
            await fkill(currentPythonProcess.pid, { force: true, tree: true });
            console.log("[Cleanup] Python process tree killed on app quit.");
        } catch (err) {
            console.error("[Cleanup] Error killing Python process tree on app quit:", err);
        }
        currentPythonProcess = null;
    }
};

// The install status is now structured as:
// {
//   python: { found, version },
//   dependencies: [ { name, status, log }, ... ],
//   model: { status, message, log },
//   stderr: <string>,
//   log: <string>,
//   timestamp: <number>
// }
const setupPronunciationInstallStatusIPC = () => {
    ipcMain.handle("get-pronunciation-install-status", async () => {
        return installConf.get("status", null);
    });
    ipcMain.handle("set-pronunciation-install-status", async (_event, status) => {
        // If the status is already in the new structure, save as is
        if (
            status &&
            status.python &&
            status.dependencies &&
            status.model &&
            "stderr" in status &&
            "log" in status
        ) {
            installConf.set("status", { ...status, timestamp: Date.now() });
        } else {
            // If the status is in the old format, attempt to migrate
            const migrated = migrateOldStatusToStructured(status);
            installConf.set("status", migrated);
        }
        return true;
    });
};

// Helper to migrate old flat status to new structured format
const migrateOldStatusToStructured = (status) => {
    if (!status) return null;
    // Try to extract python info
    const python = {
        found: status.found,
        version: status.version,
    };
    // Dependencies: if array, use as is; if single dep, wrap in array
    let dependencies = status.deps;
    if (!Array.isArray(dependencies)) {
        dependencies = dependencies ? [dependencies] : [];
    }
    // Model info
    const model = {
        status: status.modelStatus || status.status,
        message: status.modelMessage || status.message,
        log: status.modelLog || "",
    };
    return {
        python,
        dependencies,
        model,
        stderr: status.stderr || "",
        log: status.log || "",
        timestamp: Date.now(),
    };
};

export {
    cancelProcess,
    checkPythonInstalled,
    downloadModel,
    installDependencies,
    killCurrentPythonProcess,
    resetGlobalCancel,
    setupPronunciationInstallStatusIPC,
};
