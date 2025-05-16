import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isElectron } from "../../utils/isElectron";
import { sonnerSuccessToast, sonnerErrorToast } from "../../utils/sonnerCustomToast";

const SaveFolderSettings = () => {
    const { t } = useTranslation();
    const [currentFolder, setCurrentFolder] = useState("");
    const [customFolder, setCustomFolder] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isElectron()) return;
        // Get the resolved save folder
        window.electron.ipcRenderer.invoke("get-save-folder").then(setCurrentFolder);
        // Get the custom folder (if any)
        window.electron.ipcRenderer.invoke("get-custom-save-folder").then(setCustomFolder);
    }, []);

    const handleChooseFolder = async () => {
        setLoading(true);
        try {
            // Open folder dialog via Electron
            const folderPaths = await window.electron.ipcRenderer.invoke("show-open-dialog", {
                properties: ["openDirectory"],
                title: t("settingPage.saveFolderSettings.chooseFolderTitle"),
            });
            if (folderPaths && folderPaths.length > 0) {
                const selected = folderPaths[0];
                const result = await window.electron.ipcRenderer.invoke(
                    "set-custom-save-folder",
                    selected
                );
                if (result.success) {
                    setCustomFolder(selected);
                    setCurrentFolder(selected);
                    sonnerSuccessToast(t("toast.folderChanged"));
                } else {
                    let msg = t(`toast.${result.error}`);
                    if (result.reason) {
                        msg += ` ${t(result.reason)}`;
                    }
                    sonnerErrorToast(msg);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetDefault = async () => {
        setLoading(true);
        try {
            await window.electron.ipcRenderer.invoke("set-custom-save-folder", null);
            // Get the default folder again
            const folder = await window.electron.ipcRenderer.invoke("get-save-folder");
            setCustomFolder(null);
            setCurrentFolder(folder);
            sonnerSuccessToast(t("toast.folderChanged"));
        } finally {
            setLoading(false);
        }
    };

    if (!isElectron()) return null;

    return (
        <div className="flex flex-wrap gap-x-8 gap-y-6 md:flex-nowrap">
            <div className="basis-1/2 space-y-1">
                <p className="text-base font-semibold">
                    {t("settingPage.saveFolderSettings.saveFolderHeading")}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("settingPage.saveFolderSettings.saveFolderDescription")}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("settingPage.saveFolderSettings.saveFolderCurrentFolder")}{" "}
                    <span
                        lang="en"
                        className="rounded-md bg-zinc-100 px-2 py-1 font-mono! text-sm font-bold break-all text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                    >
                        {currentFolder}
                    </span>
                </p>
            </div>
            <div className="flex basis-1/2 justify-end">
                <button
                    type="button"
                    className="btn"
                    onClick={handleChooseFolder}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="loading loading-spinner loading-md"></span>
                    ) : (
                        t("settingPage.saveFolderSettings.saveFolderChooseBtn")
                    )}
                </button>
                {customFolder && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleResetDefault}
                        disabled={loading}
                    >
                        {t("settingPage.saveFolderSettings.saveFolderResetBtn")}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SaveFolderSettings;
