import { useState } from "react";
import { Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { isElectron } from "../../utils/isElectron";

const ResetSettings = ({ onReset }) => {
    const { t } = useTranslation();

    const [isResettingLocalStorage, setIsResettingLocalStorage] = useState(false);
    const [isResettingIndexedDb, setIsResettingIndexedDb] = useState(false);

    const resetLocalStorage = () => {
        setIsResettingLocalStorage(true);

        const closeDatabaseConnections = (dbName) => {
            return new Promise((resolve) => {
                const dbRequest = window.indexedDB.open(dbName);
                dbRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    db.close();
                    resolve();
                };
                dbRequest.onerror = () => {
                    resolve();
                };
            });
        };

        closeDatabaseConnections("CacheDatabase").then(() => {
            const deleteRequest = window.indexedDB.deleteDatabase("CacheDatabase");
            deleteRequest.onsuccess = () => {
                localStorage.clear();
                setIsResettingLocalStorage(false);
                document.getElementById("localStorageModal").close();
                onReset();
            };
            deleteRequest.onerror = () => setIsResettingLocalStorage(false);
            deleteRequest.onblocked = () => setIsResettingLocalStorage(false);
        });
    };

    const resetIndexedDb = () => {
        setIsResettingIndexedDb(true);

        const closeDatabaseConnections = (dbName) => {
            return new Promise((resolve) => {
                const dbRequest = window.indexedDB.open(dbName);
                dbRequest.onsuccess = (event) => {
                    const db = event.target.result;
                    db.close();
                    resolve();
                };
                dbRequest.onerror = () => {
                    resolve();
                };
            });
        };

        closeDatabaseConnections("iSpeaker_data").then(() => {
            const deleteRequest = window.indexedDB.deleteDatabase("iSpeaker_data");
            deleteRequest.onsuccess = () => {
                setIsResettingIndexedDb(false);
                document.getElementById("indexedDbModal").close();
            };
            deleteRequest.onerror = () => setIsResettingIndexedDb(false);
            deleteRequest.onblocked = () => setIsResettingIndexedDb(false);
        });
    };

    return (
        <>
            <div className="flex flex-wrap gap-x-8 gap-y-6 md:flex-nowrap">
                <div className="basis-1/2 space-y-1">
                    <p className="text-base font-semibold">
                        {t("settingPage.resetSettings.resetHeading")}
                    </p>
                </div>
                <div className="flex flex-grow basis-1/2 justify-end">
                    <div>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={() => document.getElementById("localStorageModal").showModal()}
                            disabled={isResettingLocalStorage}
                        >
                            {isResettingLocalStorage && (
                                <Spinner animation="border" size="sm" className="mr-2" />
                            )}
                            {t("settingPage.resetSettings.resetSettingsData")}
                        </button>

                        {!isElectron() && (
                            <button
                                type="button"
                                className="btn btn-error mt-4"
                                onClick={() =>
                                    document.getElementById("indexedDbModal").showModal()
                                }
                                disabled={isResettingIndexedDb}
                            >
                                {isResettingIndexedDb && (
                                    <Spinner animation="border" size="sm" className="mr-2" />
                                )}
                                {t("settingPage.resetSettings.deleteRecordingData")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* LocalStorage Modal */}
            <dialog id="localStorageModal" className="modal">
                <form method="dialog" className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t("settingPage.resetSettings.resetModalHeading")}
                    </h3>
                    <p className="py-4">
                        {t("settingPage.resetSettings.deleteRecordingDataModalMessage")}
                    </p>
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={() => document.getElementById("localStorageModal").close()}
                            disabled={isResettingLocalStorage}
                        >
                            {t("settingPage.exerciseSettings.cancelBtn")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={resetLocalStorage}
                            disabled={isResettingLocalStorage}
                        >
                            {isResettingLocalStorage && (
                                <Spinner animation="border" size="sm" className="mr-2" />
                            )}
                            {t("settingPage.resetSettings.resetConfirmBtn")}
                        </button>
                    </div>
                </form>
            </dialog>

            {/* IndexedDB Modal */}
            {!isElectron() && (
                <dialog id="indexedDbModal" className="modal">
                    <form method="dialog" className="modal-box">
                        <h3 className="text-lg font-bold">
                            {t("settingPage.resetSettings.resetModalHeading")}
                        </h3>
                        <p className="py-4">
                            {t("settingPage.resetSettings.deleteRecordingDataModalMessage")}
                        </p>
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn"
                                onClick={() => document.getElementById("indexedDbModal").close()}
                                disabled={isResettingIndexedDb}
                            >
                                {t("settingPage.exerciseSettings.cancelBtn")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-error"
                                onClick={resetIndexedDb}
                                disabled={isResettingIndexedDb}
                            >
                                {isResettingIndexedDb && (
                                    <Spinner animation="border" size="sm" className="mr-2" />
                                )}
                                {t("settingPage.resetSettings.resetConfirmBtn")}
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
        </>
    );
};

export default ResetSettings;
