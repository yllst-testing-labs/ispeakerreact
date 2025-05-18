import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IoWarningOutline } from "react-icons/io5";
import PronunciationCheckerDialogContent from "./PronunciationCheckerDialogContent";
import PronunciationCheckerInfo from "./PronunciationCheckerInfo";
import {
    checkPythonInstalled,
    installDependenciesIPC,
    downloadModelStepIPC,
} from "./PronunciationUtils";
import { getPronunciationStepStatuses } from "./pronunciationStepUtils";

const PronunciationSettings = () => {
    const { t } = useTranslation();
    const confirmDialogRef = useRef(null);
    const checkerDialogRef = useRef(null);
    const [pythonCheckResult, setPythonCheckResult] = useState(null);
    const [collapseOpen, setCollapseOpen] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const openConfirmDialog = () => {
        confirmDialogRef.current?.showModal();
    };

    const closeConfirmDialog = () => {
        confirmDialogRef.current?.close();
    };

    const openCheckerDialog = () => {
        checkerDialogRef.current?.showModal();
    };

    const closeCheckerDialog = () => {
        checkerDialogRef.current?.close();
    };

    // Listen for dependency installation progress
    useEffect(() => {
        const handleDepProgress = (_event, depStatus) => {
            console.log("[Pronunciation] Dependency Progress:", depStatus);
            setPythonCheckResult((prev) => {
                // Update deps array
                let deps = Array.isArray(prev?.deps) ? [...prev.deps] : [];
                const idx = deps.findIndex((d) => d.name === depStatus.name);
                if (idx !== -1) deps[idx] = depStatus;
                else deps.push(depStatus);
                return {
                    ...prev,
                    deps,
                    log: depStatus.log || prev?.log || "",
                };
            });
        };
        const handleCancelled = () => {
            console.log("[Pronunciation] Cancelled");
            setIsCancelling(false);
            setChecking(false);
            setPythonCheckResult(null);
            setError(null);
            checkerDialogRef.current?.close();
        };
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.on("pronunciation-dep-progress", handleDepProgress);
            window.electron.ipcRenderer.on("pronunciation-cancelled", handleCancelled);
        }
        return () => {
            if (window.electron?.ipcRenderer) {
                window.electron.ipcRenderer.removeAllListeners(
                    "pronunciation-dep-progress",
                    handleDepProgress
                );
                window.electron.ipcRenderer.removeAllListeners(
                    "pronunciation-cancelled",
                    handleCancelled
                );
            }
        };
    }, []);

    // Listen for model download progress (live console output)
    useEffect(() => {
        const handleModelProgress = (_event, msg) => {
            console.log("[Pronunciation] Model Download Progress:", msg);
            setPythonCheckResult((prev) => ({
                ...prev,
                log: (prev?.log ? prev.log + "\n" : "") + (msg.message || ""),
                modelStatus: msg.status,
                modelMessage: msg.message,
            }));
        };
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.on("pronunciation-model-progress", handleModelProgress);
        }
        return () => {
            if (window.electron?.ipcRenderer) {
                window.electron.ipcRenderer.removeAllListeners(
                    "pronunciation-model-progress",
                    handleModelProgress
                );
            }
        };
    }, []);

    // Decoupled logic for checking Python installation
    const checkPython = async () => {
        console.log("[Pronunciation] Checking Python...");
        setChecking(true);
        setError(null);
        setCollapseOpen(true);
        // Reset pythonCheckResult to clear previous modelStatus/errors
        setPythonCheckResult(null);
        try {
            const result = await checkPythonInstalled();
            console.log("[Pronunciation] Python check result:", result);
            setPythonCheckResult(result);
            if (result.found) {
                installDependencies();
            }
        } catch (err) {
            console.error("[Pronunciation] Python check error:", err);
            setError(err.message || String(err));
        } finally {
            setChecking(false);
        }
    };

    // Function to trigger dependency installation
    const installDependencies = async () => {
        console.log("[Pronunciation] Installing dependencies...");
        if (window.electron?.ipcRenderer) {
            setChecking(true);
            try {
                const result = await installDependenciesIPC();
                console.log("[Pronunciation] Dependencies installed:", result);
                setPythonCheckResult((prev) => ({ ...prev, ...result }));
                if (result.deps && result.deps.every((dep) => dep.status === "success")) {
                    downloadModelStep();
                }
            } catch (err) {
                console.error("[Pronunciation] Dependency install error:", err);
                setError(err.message || String(err));
            } finally {
                setChecking(false);
            }
        }
    };

    const downloadModelStep = async () => {
        console.log("[Pronunciation] Downloading model...");
        if (window.electron?.ipcRenderer) {
            setChecking(true);
            // Set modelStatus to 'downloading' immediately so UI shows spinner
            setPythonCheckResult((prev) => ({
                ...prev,
                modelStatus: "downloading",
                log: (prev?.log ? prev.log + "\n" : "") + "Starting model download...\n",
            }));
            try {
                const result = await downloadModelStepIPC();
                console.log("[Pronunciation] Model download result:", result);
                setPythonCheckResult((prev) => ({ ...prev, ...result }));
            } catch (err) {
                console.error("[Pronunciation] Model download error:", err);
                setPythonCheckResult((prev) => ({
                    ...prev,
                    modelStatus: "error",
                    log: (prev?.log ? prev.log + "\n" : "") + (err.message || String(err)),
                }));
            } finally {
                setChecking(false);
            }
        }
    };

    const handleProceed = () => {
        closeConfirmDialog();
        openCheckerDialog();
        checkPython();
    };

    // Use shared utility for step statuses
    const { step1Status, step2Status, step3Status } = getPronunciationStepStatuses(pythonCheckResult, checking, error);
    // Consider all steps done if none are pending
    const allStepsDone = [step1Status, step2Status, step3Status].every(
        (status) => status === "success" || status === "error"
    );

    return (
        <>
            <div className="mt-4">
                <div className="flex gap-x-8 gap-y-6">
                    <div className="flex basis-1/2 items-center space-y-1">
                        <p className="font-semibold">
                            {t("settingPage.pronunciationSettings.pronunciationHeading")}
                        </p>
                    </div>
                    <div className="flex basis-1/2 justify-end">
                        <button className="btn" onClick={openConfirmDialog}>
                            {t("settingPage.pronunciationSettings.pronunciationBtn")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation dialog */}
            <dialog ref={confirmDialogRef} className="modal">
                <PronunciationCheckerDialogContent
                    t={t}
                    checking={checking}
                    closeConfirmDialog={closeConfirmDialog}
                    handleProceed={handleProceed}
                />
            </dialog>

            {/* Checker dialog */}
            <dialog ref={checkerDialogRef} className="modal">
                <div className="modal-box w-3/4 max-w-2xl">
                    <h3 className="text-lg font-bold">
                        {t(
                            "settingPage.pronunciationSettings.pronunciationModalInstallationProcess"
                        )}
                    </h3>
                    <div className="py-4">
                        <div role="alert" className="alert alert-warning text-base">
                            <IoWarningOutline className="h-6 w-6" />
                            <span>
                                {t(
                                    "settingPage.pronunciationSettings.pronunciationModalInstallationProcessWarning"
                                )}
                            </span>
                        </div>
                        {isCancelling && (
                            <div className="mt-4 text-center text-lg font-semibold text-orange-500">
                                {t("settingPage.pronunciationSettings.cancelling", "Cancelling…")}
                            </div>
                        )}
                    </div>
                    <PronunciationCheckerInfo
                        t={t}
                        checking={checking || isCancelling}
                        error={error}
                        pythonCheckResult={pythonCheckResult}
                        collapseOpen={collapseOpen}
                        setCollapseOpen={setCollapseOpen}
                    />
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={
                                !allStepsDone
                                    ? () => {
                                          if (window.electron?.ipcRenderer) {
                                              setIsCancelling(true);
                                              window.electron.ipcRenderer.invoke(
                                                  "pronunciation-cancel-process"
                                              );
                                          }
                                      }
                                    : closeCheckerDialog
                            }
                            disabled={isCancelling}
                        >
                            {!allStepsDone
                                ? t("settingPage.exerciseSettings.cancelBtn", "Cancel")
                                : t("sound_page.closeBtn", "Close")}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default PronunciationSettings;
