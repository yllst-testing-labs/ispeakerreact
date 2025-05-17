/* global setImmediate */ // for eslint because setImmediate is node global
import cors from "cors";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import applog from "electron-log";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createSplashWindow, createWindow } from "./electron/createWindow.js";
import { expressApp } from "./electron/expressServer.js";
import {
    getLogFolder,
    getSaveFolder,
    getUserSettingsPath,
    readUserSettings,
} from "./electron/filePath.js";
import { fileVerification, verifyAndExtractIPC } from "./electron/zipOperation.js";

const DEFAULT_PORT = 8998;

let server; // Declare server at the top so it's in scope for all uses

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronSquirrelStartup = false;
try {
    electronSquirrelStartup = (await import("electron-squirrel-startup")).default;
} catch (e) {
    console.log("Error importing electron-squirrel-startup:", e);
    applog.error("Error importing electron-squirrel-startup:", e);
}
if (electronSquirrelStartup) app.quit();

let currentLogSettings = {
    numOfLogs: 10,
    keepForDays: 0,
    logLevel: "info",
    logFormat: "{h}:{i}:{s} {text}",
    maxLogSize: 5 * 1024 * 1024,
};

// After defining currentLogSettings, load from user settings if present
const userSettings = await readUserSettings();
if (userSettings.logSettings) {
    currentLogSettings = { ...currentLogSettings, ...userSettings.logSettings };
}

// Write user settings JSON
const writeUserSettings = async (settings) => {
    const settingsPath = getUserSettingsPath();
    await fsPromises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
};

// Function to generate the log file name with date-time appended
const generateLogFileName = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `ispeakerreact-log_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.log`;
};

// Global variable to hold the current log folder path
let currentLogFolder = await getLogFolder(readUserSettings);

// Configure electron-log to use the log directory
applog.transports.file.fileName = generateLogFileName();
applog.transports.file.resolvePathFn = () =>
    path.join(currentLogFolder, applog.transports.file.fileName);
applog.transports.file.maxSize = currentLogSettings.maxLogSize;
applog.transports.console.level = currentLogSettings.logLevel;

// Clean up logs on startup according to current settings
manageLogFiles();

// Handle updated log settings from the renderer
ipcMain.on("update-log-settings", async (event, newSettings) => {
    currentLogSettings = newSettings;
    applog.info("Log settings updated:", currentLogSettings);

    // Save to user settings file
    const userSettings = await readUserSettings();
    userSettings.logSettings = currentLogSettings;
    await writeUserSettings(userSettings);

    manageLogFiles();
});

// Function to check and manage log files based on the currentLogSettings
async function manageLogFiles() {
    try {
        const { numOfLogs, keepForDays } = currentLogSettings;

        applog.info("Log settings:", currentLogSettings);

        // Get all log files
        const logFiles = await fsPromises.readdir(currentLogFolder);
        const logFilesResolved = [];
        for (const file of logFiles) {
            const filePath = path.join(currentLogFolder, file);
            try {
                const stats = await fsPromises.stat(filePath);
                logFilesResolved.push({
                    path: filePath,
                    birthtime: stats.birthtime,
                });
            } catch (err) {
                if (err.code !== "ENOENT") {
                    applog.error(`Error stating log file: ${filePath}`, err);
                }
                // If ENOENT, just skip this file
            }
        }

        // Sort log files by creation time (oldest first)
        logFilesResolved.sort((a, b) => a.birthtime - b.birthtime);

        // Remove logs if they exceed the specified limit (excluding 0 for unlimited)
        if (numOfLogs > 0 && logFilesResolved.length > numOfLogs) {
            const filesToDelete = logFilesResolved.slice(0, logFilesResolved.length - numOfLogs);
            for (const file of filesToDelete) {
                try {
                    await fsPromises.unlink(file.path);
                    applog.info(`Deleted log file: ${file.path}`);
                } catch (err) {
                    if (err.code !== "ENOENT") {
                        applog.error(`Error deleting log file: ${file.path}`, err);
                    }
                }
            }
        }

        // Remove logs older than the specified days (excluding 0 for never)
        if (keepForDays > 0) {
            const now = new Date();
            for (const file of logFilesResolved) {
                const ageInDays = (now - new Date(file.birthtime)) / (1000 * 60 * 60 * 24);
                if (ageInDays > keepForDays) {
                    try {
                        await fsPromises.unlink(file.path);
                        applog.info(`Deleted old log file: ${file.path}`);
                    } catch (err) {
                        if (err.code !== "ENOENT") {
                            applog.error(`Error deleting old log file: ${file.path}`, err);
                        }
                    }
                }
            }
        }
    } catch (error) {
        applog.error("Error managing log files:", error);
    }
}

let mainWindow;

// Allow requests from localhost:5173 (Vite's default development server)
expressApp.use(cors({ origin: "http://localhost:5173" }));

// Set up rate limiter: maximum of 2000 requests per 15 minutes
/*const limiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
});*/

// Set up the express server to serve video files
expressApp.get("/video/:folderName/:fileName", async (req, res) => {
    const { folderName, fileName } = req.params;
    const documentsPath = await getSaveFolder(readUserSettings);
    const videoFolder = path.resolve(documentsPath, "video_files", folderName);
    const videoFilePath = path.resolve(videoFolder, fileName);

    if (!videoFilePath.startsWith(videoFolder)) {
        res.status(403).send("Access denied.");
        return;
    }

    try {
        await fsPromises.access(videoFilePath);
        const stat = await fsPromises.stat(videoFilePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const file = fs.createReadStream(videoFilePath, { start, end });
            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "video/mp4",
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
            };
            res.writeHead(200, head);
            fs.createReadStream(videoFilePath).pipe(res);
        }
    } catch {
        res.status(404).send("Video file not found.");
        return;
    }
});

// Handle the IPC event from the renderer
ipcMain.handle("open-external-link", async (event, url) => {
    await shell.openExternal(url); // Open the external link
});

// Handle saving a recording
ipcMain.handle("save-recording", async (event, key, arrayBuffer) => {
    const saveFolder = await getSaveFolder(readUserSettings);
    const recordingFolder = path.join(saveFolder, "saved_recordings");
    const filePath = path.join(recordingFolder, `${key}.wav`);

    // Ensure the directory exists
    try {
        await fsPromises.access(recordingFolder);
    } catch {
        await fsPromises.mkdir(recordingFolder, { recursive: true });
    }

    try {
        const buffer = Buffer.from(arrayBuffer);
        await fsPromises.writeFile(filePath, buffer);
        console.log("Recording saved to:", filePath);
        applog.log("Recording saved to:", filePath);
        return "Success";
    } catch (error) {
        console.error("Error saving the recording to disk:", error);
        throw error;
    }
});

// Handle checking if a recording exists
ipcMain.handle("check-recording-exists", async (event, key) => {
    const saveFolder = await getSaveFolder(readUserSettings);
    const filePath = path.join(saveFolder, "saved_recordings", `${key}.wav`);

    try {
        await fsPromises.access(filePath);
        return true;
    } catch {
        return false;
    }
});

// Handle playing a recording (this can be improved for streaming)
ipcMain.handle("play-recording", async (event, key) => {
    const filePath = path.join(
        await getSaveFolder(readUserSettings),
        "saved_recordings",
        `${key}.wav`
    );

    // Check if the file exists
    try {
        const data = await fsPromises.readFile(filePath);
        return data.buffer; // Return the ArrayBuffer to the renderer process
    } catch {
        console.error("File not found:", filePath);
        throw new Error("Recording file not found");
    }
});

ipcMain.handle("check-downloads", async () => {
    const saveFolder = await getSaveFolder(readUserSettings);
    const videoFolder = path.join(saveFolder, "video_files");
    // Ensure the directory exists
    try {
        await fsPromises.access(videoFolder);
    } catch {
        await fsPromises.mkdir(videoFolder, { recursive: true });
    }

    const files = await fsPromises.readdir(videoFolder);
    // Return the list of zip files in the download folder
    const zipFiles = files.filter((file) => file.endsWith(".7z"));
    return zipFiles.length === 0 ? "no zip files downloaded" : zipFiles;
});

ipcMain.handle("get-video-file-data", async () => {
    const jsonPath = path.join(__dirname, "dist", "json", "videoFilesInfo.json");
    try {
        const jsonData = await fsPromises.readFile(jsonPath, "utf-8"); // Asynchronously read the JSON file
        return JSON.parse(jsonData); // Parse the JSON string and return it
    } catch (error) {
        console.error("Error reading JSON file:", error);
        throw error; // Ensure that any error is propagated back to the renderer process
    }
});

// Handle the IPC event to get and open the folder
ipcMain.handle("get-video-save-folder", async () => {
    const saveFolder = await getSaveFolder(readUserSettings);
    const videoFolder = path.join(saveFolder, "video_files");

    // Ensure the directory exists
    try {
        await fsPromises.access(videoFolder);
    } catch {
        await fsPromises.mkdir(videoFolder, { recursive: true });
    }

    // Open the folder in the file manager
    shell.openPath(videoFolder); // Open the folder

    return videoFolder; // Send the path back to the renderer
});

// Handle the IPC event to get the current server port
ipcMain.handle("get-port", () => {
    return server?.address()?.port || DEFAULT_PORT;
});

ipcMain.handle("open-log-folder", async () => {
    // Open the folder in the file manager
    shell.openPath(currentLogFolder); // Open the folder
    return currentLogFolder; // Send the path back to the renderer
});

// Check video extracted folder
ipcMain.handle("check-extracted-folder", async (event, folderName, zipContents) => {
    const saveFolder = await getSaveFolder(readUserSettings);
    const extractedFolder = path.join(saveFolder, "video_files", folderName);

    // Check if extracted folder exists
    try {
        await fsPromises.access(extractedFolder);
        const extractedFiles = await fsPromises.readdir(extractedFolder);

        // Check if all expected files are present in the extracted folder
        const allFilesExtracted = zipContents[0].extractedFiles.every((file) => {
            return extractedFiles.includes(file.name);
        });

        event.sender.send("progress-update", 0);

        return allFilesExtracted; // Return true if all files are extracted, else false
    } catch {
        return false; // Return false if the folder doesn't exist
    }
});

verifyAndExtractIPC(() => getSaveFolder(readUserSettings), fileVerification);

// Listen for logging messages from the renderer process
ipcMain.on("renderer-log", (event, logMessage) => {
    const { level, message } = logMessage;
    if (applog[level]) {
        applog[level](`Renderer log: ${message}`);
    }
});

// Handle uncaught exceptions globally and quit the app
process.on("uncaughtException", (error) => {
    console.error("An uncaught error occurred:", error);
    applog.error("An uncaught error occurred:", error);
    app.quit(); // Quit the app on an uncaught exception
});

// Handle unhandled promise rejections globally and quit the app
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled promise rejection at:", promise, "reason:", reason);
    applog.error("Unhandled promise rejection at:", promise, "reason:", reason);
    app.quit(); // Quit the app on an unhandled promise rejection
});

app.on("renderer-process-crashed", (event, webContents, killed) => {
    applog.error("Renderer process crashed", { event, killed });
    app.quit();
});

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// Recreate the window on macOS when the dock icon is clicked.
app.on("activate", () => {
    if (mainWindow === null) {
        createWindow(__dirname, (srv) => {
            server = srv;
        });
    }
});

app.whenReady()
    .then(() => {
        // 1. Show splash window immediately
        createSplashWindow(__dirname);

        // 2. Start heavy work in parallel after splash is shown
        setImmediate(() => {
            // Create main window (can be shown after splash)
            createWindow(__dirname, (srv) => {
                server = srv;
            });

            // Wait for log settings and manage logs in background
            ipcMain.once("update-log-settings", (event, settings) => {
                currentLogSettings = settings;
                applog.info("Log settings received from renderer:", settings);
                manageLogFiles().then(() => {
                    applog.info("Log files managed successfully.");
                });
            });
        });
    })
    .catch((error) => {
        // Catch any errors thrown in the app.whenReady() promise itself
        applog.error("Error in app.whenReady():", error);
    });

// IPC: Get current save folder (resolved)
ipcMain.handle("get-save-folder", async () => {
    return await getSaveFolder(readUserSettings);
});

// IPC: Get current custom save folder (raw, may be undefined)
ipcMain.handle("get-custom-save-folder", async () => {
    const userSettings = await readUserSettings();
    return userSettings.customSaveFolder || null;
});

// Helper: Windows system folder deny-list
const isDeniedSystemFolder = (folderPath) => {
    const denyList = [
        process.env.SystemDrive + "\\", // e.g., C:\
        process.env.SystemRoot, // e.g., C:\Windows
        path.join(process.env.SystemDrive, "Program Files"),
        path.join(process.env.SystemDrive, "Program Files (x86)"),
        path.join(process.env.SystemDrive, "Users"),
        app.getPath("userData"),
        app.getPath("exe"),
        app.getPath("appData"),
    ].filter(Boolean);
    const normalized = path.resolve(folderPath).toLowerCase();
    return denyList.some(
        (sysPath) => sysPath && normalized === path.resolve(sysPath).toLowerCase()
    );
};

// Helper: Recursively collect all files in a directory
async function getAllFiles(dir, base = dir) {
    let files = [];
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await getAllFiles(fullPath, base));
        } else {
            files.push({
                abs: fullPath,
                rel: path.relative(base, fullPath),
            });
        }
    }
    return files;
}

// Helper: Recursively remove empty directories
async function removeEmptyDirs(dir) {
    let isEmpty = true;
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const childEmpty = await removeEmptyDirs(fullPath);
            if (childEmpty) {
                await fsPromises.rmdir(fullPath).catch(() => {});
            } else {
                isEmpty = false;
            }
        } else {
            isEmpty = false;
        }
    }
    return isEmpty;
}

// Helper: Move all contents from one folder to another (copy then delete, robust for cross-device)
async function moveFolderContents(src, dest, event) {
    // Recursively collect all files for accurate progress
    const files = await getAllFiles(src);
    const total = files.length;
    let moved = 0;
    // 1. Copy all files
    for (const file of files) {
        const srcPath = file.abs;
        const destPath = path.join(dest, file.rel);
        await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
        await fsPromises.copyFile(srcPath, destPath);
        moved++;
        if (event)
            event.sender.send("move-folder-progress", {
                moved,
                total,
                phase: "copy",
                name: file.rel,
            });
    }
    // 2. Delete all originals (files only)
    for (const file of files) {
        const srcPath = file.abs;
        await fsPromises.rm(srcPath, { force: true });
        if (event)
            event.sender.send("move-folder-progress", {
                moved,
                total,
                phase: "delete",
                name: file.rel,
            });
    }
    // 3. Remove empty directories in src
    await removeEmptyDirs(src);
}

// IPC: Set custom save folder with validation and move contents
ipcMain.handle("set-custom-save-folder", async (event, folderPath) => {
    const oldSaveFolder = await getSaveFolder(readUserSettings);
    let newSaveFolder;
    if (!folderPath) {
        // Reset to default
        const userSettings = await readUserSettings();
        delete userSettings.customSaveFolder;
        await writeUserSettings(userSettings);
        newSaveFolder = path.join(app.getPath("documents"), "iSpeakerReact");
        console.log("Reset to default save folder:", newSaveFolder);
        applog.info("Reset to default save folder:", newSaveFolder);
    } else {
        try {
            await fsPromises.access(folderPath);
            const stat = await fsPromises.stat(folderPath);
            if (!stat.isDirectory()) {
                console.log("Folder is not a directory:", folderPath);
                applog.error("Folder is not a directory:", folderPath);
                return { success: false, error: "folderChangeError", reason: "toast.folderNotDir" };
            }
            if (process.platform === "win32" && isDeniedSystemFolder(folderPath)) {
                console.log("Folder is restricted:", folderPath);
                applog.error("Folder is restricted:", folderPath);
                return {
                    success: false,
                    error: "folderChangeError",
                    reason: "toast.folderRestricted",
                };
            }
            const testFile = path.join(folderPath, `.__ispeakerreact_test_${Date.now()}`);
            try {
                await fsPromises.writeFile(testFile, "test");
                await fsPromises.unlink(testFile);
            } catch {
                console.log("Folder is not writable:", folderPath);
                applog.error("Folder is not writable:", folderPath);
                return {
                    success: false,
                    error: "folderChangeError",
                    reason: "toast.folderNoWrite",
                };
            }
            // All good, save
            const userSettings = await readUserSettings();
            userSettings.customSaveFolder = folderPath;
            await writeUserSettings(userSettings);
            newSaveFolder = folderPath;
            console.log("New save folder:", newSaveFolder);
            applog.info("New save folder:", newSaveFolder);
        } catch (err) {
            console.log("Error setting custom save folder:", err);
            applog.error("Error setting custom save folder:", err);
            return {
                success: false,
                error: "folderChangeError",
                reason: err.message || "Unknown error",
            };
        }
    }
    // Move contents if needed
    try {
        if (
            oldSaveFolder !== newSaveFolder &&
            fs.existsSync(oldSaveFolder) &&
            fs.existsSync(newSaveFolder) &&
            !oldSaveFolder.startsWith(newSaveFolder) &&
            !newSaveFolder.startsWith(oldSaveFolder)
        ) {
            await moveFolderContents(oldSaveFolder, newSaveFolder, event);
        }
        // Update log directory and file name to new save folder
        currentLogFolder = path.join(newSaveFolder, "logs");
        try {
            await fsPromises.mkdir(currentLogFolder, { recursive: true });
        } catch (e) {
            console.log("Failed to create new log directory:", e);
            applog.warn("Failed to create new log directory:", e);
        }
        applog.transports.file.fileName = generateLogFileName();
        applog.transports.file.resolvePathFn = () =>
            path.join(currentLogFolder, applog.transports.file.fileName);
        applog.info("New log directory:", currentLogFolder);
        console.log("New log directory:", currentLogFolder);
        return { success: true, newPath: newSaveFolder };
    } catch (moveErr) {
        console.log("Failed to move folder contents:", moveErr);
        applog.error("Failed to move folder contents:", moveErr);
        return {
            success: false,
            error: "folderMoveError",
            reason: moveErr.message || "Unknown move error",
        };
    }
});

// IPC: Show open dialog for folder selection
ipcMain.handle("show-open-dialog", async (event, options) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, options);
    return result.filePaths;
});

ipcMain.handle("get-log-settings", async () => {
    return currentLogSettings;
});
