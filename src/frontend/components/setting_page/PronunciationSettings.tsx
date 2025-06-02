import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoInformationCircleOutline,
    IoWarningOutline,
} from "react-icons/io5";
import PronunciationCheckerDialogContent from "./PronunciationCheckerDialogContent.js";
import PronunciationCheckerInfo from "./PronunciationCheckerInfo.js";
import {
    checkPythonInstalled,
    downloadModelStepIPC,
    installDependenciesIPC,
} from "./PronunciationUtils.js";
import {
    getPronunciationStepStatuses,
    getPronunciationInstallState,
    PronunciationInstallStatus,
    PronunciationDependency,
} from "./pronunciationStepUtils.js";
import modelOptions from "./modelOptions.js";

const PronunciationSettings = () => {
    const { t } = useTranslation();
    const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
    const checkerDialogRef = useRef<HTMLDialogElement | null>(null);
    const [pythonCheckResult, setPythonCheckResult] = useState<PronunciationInstallStatus | null>(
        null
    );
    const [checking, setChecking] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState<boolean>(false);
    const [installState, setInstallState] = useState<"not_installed" | "failed" | "complete">(
        "not_installed"
    );
    // Model selection state
    const [modelValue, setModelValue] = useState<string>(
        "vitouphy/wav2vec2-xls-r-300m-timit-phoneme"
    );
    const onModelChange = (value: string) => setModelValue(value);

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
        // Update installState after closing if all steps are done
        const { step1Status, step2Status, step3Status } = getPronunciationStepStatuses(
            pythonCheckResult,
            checking,
            error
        );
        const allStepsDone = [step1Status, step2Status, step3Status].every(
            (status) => status === "success" || status === "error"
        );
        if (allStepsDone) {
            // Transform pythonCheckResult to expected structure for getPronunciationInstallState
            const installStatusObj: PronunciationInstallStatus = {
                python: { found: pythonCheckResult?.found ?? false },
                dependencies: pythonCheckResult?.deps,
                model: { status: pythonCheckResult?.modelStatus ?? "" },
            };
            setInstallState(getPronunciationInstallState(installStatusObj));
        }
    };

    // Helper to save install status to electron-conf
    const saveInstallStatus = async (result: PronunciationInstallStatus) => {
        if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke("set-pronunciation-install-status", result);
        }
    };

    // On mount, load cached install status
    useEffect(() => {
        const fetchInstallStatus = async () => {
            if (window.electron?.ipcRenderer) {
                const cachedStatus = await window.electron.ipcRenderer.invoke(
                    "get-pronunciation-install-status"
                );
                const statusTyped = cachedStatus as PronunciationInstallStatus | null;
                const state = getPronunciationInstallState(statusTyped);
                setInstallState(state);
                console.log("cachedStatus", cachedStatus);
                if (state === "complete") {
                    setPythonCheckResult(statusTyped);
                    setError(null);
                } else if (state === "failed") {
                    setPythonCheckResult(statusTyped);
                    setError(
                        pickFirstString(
                            typeof statusTyped?.log === "string" ? statusTyped.log : "",
                            typeof statusTyped?.modelMessage === "string"
                                ? statusTyped.modelMessage
                                : "",
                            typeof statusTyped?.dependencyLog === "string"
                                ? statusTyped.dependencyLog
                                : ""
                        )
                    );
                    window.electron.log(
                        "error",
                        `Pronunciation install failed. ${JSON.stringify(statusTyped)}`
                    );
                } else {
                    setPythonCheckResult(null);
                    setError(null);
                }
            }
        };
        fetchInstallStatus();
    }, []);

    // Listen for dependency installation progress
    useEffect(() => {
        const handleDepProgress = (...args: unknown[]) => {
            const depStatus = args[1] as PronunciationDependency;
            setPythonCheckResult((prev) => {
                if (!prev) return prev;
                const deps = Array.isArray(prev.deps) ? [...prev.deps] : [];
                const idx = deps.findIndex((d) => d.name === depStatus.name);
                if (idx !== -1) deps[idx] = depStatus;
                else deps.push(depStatus);
                const updated = {
                    ...prev,
                    deps,
                    dependencyLog: depStatus.log || prev?.dependencyLog || "",
                };
                return updated;
            });
        };
        const handleCancelled = () => {
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
                window.electron.ipcRenderer.removeListener(
                    "pronunciation-dep-progress",
                    handleDepProgress
                );
                window.electron.ipcRenderer.removeListener(
                    "pronunciation-cancelled",
                    handleCancelled
                );
            }
        };
    }, []);

    // Listen for model download progress (live console output)
    useEffect(() => {
        const handleModelProgress = (...args: unknown[]) => {
            const msg = args[1] as { status: string; message?: string };
            setPythonCheckResult((prev) => {
                if (!prev) return prev;
                const updated = {
                    ...prev,
                    log: undefined, // Remove old log field if present
                    modelLog: (prev?.modelLog ? prev.modelLog + "\n" : "") + (msg.message || ""),
                    modelStatus: msg.status,
                    modelMessage: msg.message,
                };
                return updated;
            });
        };
        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.on("pronunciation-model-progress", handleModelProgress);
        }
        return () => {
            if (window.electron?.ipcRenderer) {
                window.electron.ipcRenderer.removeListener(
                    "pronunciation-model-progress",
                    handleModelProgress
                );
            }
        };
    }, []);

    // Decoupled logic for checking Python installation
    const checkPython = async () => {
        setChecking(true);
        setError(null);
        setPythonCheckResult(null);
        try {
            const resultRaw = await checkPythonInstalled();
            const result = resultRaw as PronunciationInstallStatus;
            setPythonCheckResult((prev) => ({
                ...prev,
                pythonLog: result.log || "",
                ...result,
            }));
            if (result.found) {
                installDependencies();
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error("[Pronunciation] Python check error:", err);
            setError(errorMsg);
        } finally {
            setChecking(false);
        }
    };

    // Function to trigger dependency installation
    const installDependencies = async () => {
        if (window.electron?.ipcRenderer) {
            setChecking(true);
            try {
                const resultRaw = await installDependenciesIPC();
                const result = resultRaw as PronunciationInstallStatus;
                setPythonCheckResult((prev) => {
                    if (!prev) return {} as PronunciationInstallStatus;
                    const updated: PronunciationInstallStatus = { ...prev, ...result };
                    return updated;
                });
                if (
                    result.deps &&
                    result.deps.every((dep: PronunciationDependency) => dep.status === "success")
                ) {
                    downloadModelStep();
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error("[Pronunciation] Dependency install error:", err);
                setError(errorMsg);
                window.electron.log("error", `Dependency install error: ${errorMsg}`);
            } finally {
                setChecking(false);
            }
        }
    };

    const downloadModelStep = async () => {
        if (window.electron?.ipcRenderer) {
            setChecking(true);
            setPythonCheckResult((prev) => {
                if (!prev) return {} as PronunciationInstallStatus;
                const updated = {
                    ...prev,
                    modelStatus: "downloading",
                    log: (prev?.log ? prev.log + "\n" : "") + "Starting model download...\n",
                };
                return updated;
            });
            try {
                // Pass modelValue to IPC
                const resultRaw = await downloadModelStepIPC(modelValue);
                const result = resultRaw as PronunciationInstallStatus;
                setPythonCheckResult((prev) => {
                    if (!prev) return {} as PronunciationInstallStatus;
                    const updated: PronunciationInstallStatus = { ...prev, ...result };
                    return updated;
                });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error("[Pronunciation] Model download error:", err);
                setPythonCheckResult((prev) => {
                    if (!prev) return {} as PronunciationInstallStatus;
                    const updated: PronunciationInstallStatus = {
                        ...prev,
                        modelStatus: "error",
                        log: (prev?.log ? prev.log + "\n" : "") + errorMsg,
                    };
                    return updated;
                });
                window.electron.log("error", `Model download error: ${errorMsg}`);
            } finally {
                setChecking(false);
            }
        }
    };

    // Save install status when installation is complete (all steps done)
    useEffect(() => {
        const { step1Status, step2Status, step3Status } = getPronunciationStepStatuses(
            pythonCheckResult,
            checking,
            error
        );
        const allStepsDone = [step1Status, step2Status, step3Status].every(
            (status) => status === "success" || status === "error"
        );
        if (pythonCheckResult && allStepsDone) {
            saveInstallStatus(pythonCheckResult);
        }
    }, [pythonCheckResult, checking, error]);

    const handleProceed = async () => {
        closeConfirmDialog();
        openCheckerDialog();
        if (window.electron?.ipcRenderer) {
            await window.electron.ipcRenderer.invoke("pronunciation-reset-cancel-flag");
        }
        checkPython();
    };

    // Use shared utility for step statuses
    const { step1Status, step2Status, step3Status } = getPronunciationStepStatuses(
        pythonCheckResult,
        checking,
        error
    );
    // Consider all steps done if none are pending
    const allStepsDone = [step1Status, step2Status, step3Status].every(
        (status) => status === "success" || status === "error"
    );
    // Consider installation failed if all steps are done and at least one is error
    const installationFailed =
        allStepsDone &&
        [step1Status, step2Status, step3Status].some((status) => status === "error");

    // Find the selected model's size
    const selectedModel = modelOptions.find((opt) => opt.value === modelValue);
    const selectedModelSize = selectedModel ? selectedModel.size : "";

    // Helper to pick the first defined string value
    function pickFirstString(...args: (string | undefined)[]): string {
        for (const arg of args) {
            if (typeof arg === "string" && arg.length > 0) return arg;
        }
        return "Installation failed.";
    }

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
                        {installState === "complete" ? (
                            <button className="btn" onClick={openConfirmDialog}>
                                {t("settingPage.pronunciationSettings.reinstallBtn")}
                            </button>
                        ) : (
                            <button className="btn" onClick={openConfirmDialog}>
                                {t("settingPage.pronunciationSettings.pronunciationBtn")}
                            </button>
                        )}
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
                    installState={installState}
                    modelValue={modelValue}
                    onModelChange={onModelChange}
                />
            </dialog>

            {/* Checker dialog */}
            <dialog ref={checkerDialogRef} className="modal">
                <div className="modal-box w-3/4 max-w-2xl">
                    <h3 className="text-lg font-bold">
                        {t("settingPage.pronunciationSettings.installationProcess")}
                    </h3>

                    {!allStepsDone ? (
                        <div className="py-4">
                            <div role="alert" className="alert alert-warning text-base">
                                <IoWarningOutline className="h-6 w-6" />
                                <span>
                                    {t(
                                        "settingPage.pronunciationSettings.installationProcessWarning"
                                    )}
                                </span>
                            </div>
                        </div>
                    ) : installationFailed ? (
                        <div className="py-4">
                            <div role="alert" className="alert alert-error text-base">
                                <IoCloseCircleOutline className="h-6 w-6" />
                                <span>
                                    {t(
                                        "settingPage.pronunciationSettings.installationProcessFailed"
                                    )}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4">
                            <div role="alert" className="alert alert-success text-base">
                                <IoCheckmarkCircleOutline className="h-6 w-6" />
                                <span>
                                    {t(
                                        "settingPage.pronunciationSettings.installationProcessSuccess"
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {isCancelling && (
                        <div className="py-4">
                            <div role="alert" className="alert alert-info text-base">
                                <IoInformationCircleOutline className="h-6 w-6" />
                                {t(
                                    "settingPage.pronunciationSettings.installationProcessCancelling"
                                )}
                            </div>
                        </div>
                    )}

                    <PronunciationCheckerInfo
                        t={t}
                        checking={checking || isCancelling}
                        error={error}
                        pythonCheckResult={pythonCheckResult}
                        modelSize={selectedModelSize}
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
                            {!allStepsDone ? (
                                isCancelling ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm mr-2"
                                            role="status"
                                        />
                                        {t("settingPage.exerciseSettings.cancelBtn")}
                                    </>
                                ) : (
                                    t("settingPage.exerciseSettings.cancelBtn")
                                )
                            ) : (
                                t("sound_page.closeBtn", "Close")
                            )}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default PronunciationSettings;
