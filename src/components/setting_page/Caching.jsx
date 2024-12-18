import { useEffect, useState } from "react";
import { Card, Form, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import {
    deleteCachedJsonFiles,
    getFileFromIndexedDB,
    getHashJsonFromIndexedDB,
    saveFileToIndexedDB,
    saveHashJsonToIndexedDB,
} from "./offlineStorageDb";

const CachingSettings = () => {
    const { t } = useTranslation();

    const [cacheMenuFiles, setCacheMenuFiles] = useState(false);
    const [menuErrorText, setMenuErrorText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // URLs for JSON files
    const jsonUrl = `${import.meta.env.BASE_URL}json/json_file_hashes.json`;

    // Initialize localStorage if necessary
    const initializeLocalStorage = () => {
        let ispeaker = JSON.parse(localStorage.getItem("ispeaker"));
        if (!ispeaker) {
            ispeaker = {
                webOptions: {
                    cachedJsons: false,
                },
            };
            localStorage.setItem("ispeaker", JSON.stringify(ispeaker));
        } else if (!ispeaker.webOptions) {
            ispeaker.webOptions = {
                cachedJsons: false,
            };
            localStorage.setItem("ispeaker", JSON.stringify(ispeaker));
        }
        return ispeaker;
    };

    // Check if JSON files are cached
    const areFilesCached = async () => {
        const hashJson = await getHashJsonFromIndexedDB("json");
        if (!hashJson) return false;

        const cachedFiles = await Promise.all(
            hashJson.map(async (fileObj) => {
                const cachedFile = await getFileFromIndexedDB(fileObj.file, "json");
                return cachedFile !== null;
            })
        );

        return cachedFiles.every(Boolean); // True if all files are cached
    };

    // Sync with localStorage and IndexedDB when component mounts
    useEffect(() => {
        const syncWithStorageAndIndexedDB = async () => {
            const ispeaker = initializeLocalStorage();
            const cachedJsonFiles = await areFilesCached();

            setCacheMenuFiles(cachedJsonFiles);
            ispeaker.webOptions.cachedJsons = cachedJsonFiles;
            localStorage.setItem("ispeaker", JSON.stringify(ispeaker));
        };

        syncWithStorageAndIndexedDB();
    }, []);

    // Handle toggling JSON caching
    const handleCacheToggle = async () => {
        setIsProcessing(true);

        if (cacheMenuFiles) {
            // Toggling off: Delete cached JSON files
            await deleteCachedJsonFiles();
            setCacheMenuFiles(false);
            updateLocalStorage(false);
        } else {
            // Toggling on: Download and cache JSON files
            try {
                const downloadedHashJson = await downloadHashJson(jsonUrl);
                if (!downloadedHashJson) {
                    setMenuErrorText(t("settingPage.cacheSettings.cacheMenuError"));
                    setIsProcessing(false);
                    return;
                }

                await saveHashJsonToIndexedDB("json", downloadedHashJson);
                await downloadAndCacheFiles(downloadedHashJson);
                setCacheMenuFiles(true);
                updateLocalStorage(true);
            } catch (error) {
                console.error("Error caching files:", error);
                setMenuErrorText(t("settingPage.cacheSettings.cacheJSONFileError"));
            }
        }

        setIsProcessing(false);
    };

    // Update localStorage based on cache state
    const updateLocalStorage = (isCached) => {
        let ispeaker = initializeLocalStorage();
        ispeaker.webOptions.cachedJsons = isCached;
        localStorage.setItem("ispeaker", JSON.stringify(ispeaker));
    };

    // Download the hash JSON file
    const downloadHashJson = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to download hash JSON");
            return await response.json();
        } catch (error) {
            console.error("Error downloading hash JSON:", error);
            return null;
        }
    };

    // Download and cache JSON files
    const downloadAndCacheFiles = async (hashJson) => {
        for (const fileObj of hashJson) {
            const fileUrl = `${import.meta.env.BASE_URL}json/${fileObj.file}`;

            try {
                const response = await fetch(fileUrl);
                const fileContent = await response.blob();
                await saveFileToIndexedDB(fileObj.file, fileContent, "json");
            } catch (error) {
                console.error(`Error downloading file: ${fileObj.file}`, error);
                throw error;
            }
        }
    };

    return (
        <div className="mt-4">
            <div className="flex gap-x-8 gap-y-6">
                <div className="basis-2/3 space-y-1">
                    <label className="cursor-pointer text-base font-semibold" htmlFor="cacheJson">
                        {t("settingPage.cacheSettings.menuCacheOption")}
                    </label>
                </div>
                <div className="flex basis-1/3 items-center justify-end">
                    {isProcessing ? (
                        <div className="loading loading-spinner loading-md"></div>
                    ) : (
                        <input
                            type="checkbox"
                            className="toggle"
                            id="cacheJson"
                            checked={cacheMenuFiles}
                            onChange={handleCacheToggle}
                            disabled={isProcessing}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default CachingSettings;
