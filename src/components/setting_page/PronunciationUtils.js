const checkPythonInstalled = async () => {
    if (window.electron?.ipcRenderer) {
        return await window.electron.ipcRenderer.invoke("check-python-installed");
    } else {
        throw new Error("Not running in Electron environment.");
    }
};

export { checkPythonInstalled };
