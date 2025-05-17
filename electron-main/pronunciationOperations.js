import { exec } from "node:child_process";

const checkPythonInstalled = async () => {
    return new Promise((resolve) => {
        exec("python3 --version", (err, stdout, stderr) => {
            if (!err && stdout) {
                resolve({ found: true, version: stdout.trim(), stderr: stderr.trim() });
            } else {
                exec("python --version", (err2, stdout2, stderr2) => {
                    if (!err2 && stdout2) {
                        resolve({ found: true, version: stdout2.trim(), stderr: stderr2.trim() });
                    } else {
                        resolve({
                            found: false,
                            version: null,
                            stderr: (stderr2 || stderr || "").trim(),
                        });
                    }
                });
            }
        });
    });
};

export { checkPythonInstalled };
