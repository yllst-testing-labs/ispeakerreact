import { ipcMain } from "electron";
import { exec } from "node:child_process";

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

        // Final result
        return {
            deps: depResults,
            log: log.trim(),
        };
    });
};

export { checkPythonInstalled, installDependencies };

