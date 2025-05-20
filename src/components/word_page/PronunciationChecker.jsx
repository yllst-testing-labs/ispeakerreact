import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { convertToWav } from "../../utils/ffmpegWavConverter";
import { isElectron } from "../../utils/isElectron";
import { alignPhonemes, getCharacterDiff, levenshtein } from "../../utils/levenshtein";
import openExternal from "../../utils/openExternal";
import { parseIPA } from "./syllableParser";

const PronunciationChecker = ({
    icon,
    disabled,
    wordKey,
    displayPronunciation,
    modelName,
    onLoadingChange,
}) => {
    const { t } = useTranslation();
    const [result, setResult] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const notInstalledDialogRef = useRef();
    const webDialogRef = useRef();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");
    const [errorDetails, setErrorDetails] = useState("");
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showFailedInstall, setShowFailedInstall] = useState(false);

    useEffect(() => {
        if (!isElectron()) return;
        const handler = (_event, msg) => {
            if (msg && msg.status === "progress") {
                setProgress(msg.message);
            }
        };
        window.electron?.ipcRenderer?.on("pronunciation-model-progress", handler);
        return () => {
            window.electron?.ipcRenderer?.removeListener("pronunciation-model-progress", handler);
        };
    }, []);

    useEffect(() => {
        if (showResult) setProgress("");
    }, [showResult]);

    useEffect(() => {
        if (onLoadingChange) onLoadingChange(loading);
    }, [loading, onLoadingChange]);

    // Recursively check for any status key with value 'error' or 'failed'
    const hasErrorStatus = (obj) => {
        if (!obj || typeof obj !== "object") return false;
        if (Array.isArray(obj)) {
            return obj.some(hasErrorStatus);
        }
        for (const key in obj) {
            if (
                (key === "status" &&
                    (obj[key] === "error" || obj[key] === "failed" || obj[key] === "cancelled")) ||
                (key === "found" && obj[key] === false)
            ) {
                return true;
            }
            if (typeof obj[key] === "object" && hasErrorStatus(obj[key])) {
                return true;
            }
        }
        return false;
    };

    const checkPronunciation = async () => {
        if (!isElectron()) {
            // Show dialog for web
            if (webDialogRef.current) {
                webDialogRef.current.showModal();
            }
            return;
        }
        // Fetch install status on demand
        let installStatus = null;
        if (window.electron?.ipcRenderer) {
            installStatus = await window.electron.ipcRenderer.invoke(
                "get-pronunciation-install-status"
            );
        }
        // 1. No install status at all
        if (!installStatus) {
            setShowFailedInstall(false);
            if (notInstalledDialogRef.current) notInstalledDialogRef.current.showModal();
            return;
        }
        // 2. Check for any error/failed status in the object
        if (hasErrorStatus(installStatus)) {
            setShowFailedInstall(true);
            if (notInstalledDialogRef.current) notInstalledDialogRef.current.showModal();
            return;
        } else {
            setShowFailedInstall(false);
        }
        setLoading(true);
        setProgress("");
        setErrorDetails("");
        try {
            // 1. Get the original recording blob from Electron
            const originalBlobArrayBuffer = await window.electron.getRecordingBlob(wordKey);
            const originalBlob = new Blob([originalBlobArrayBuffer]);

            // 2. Convert to real WAV
            const realWavBlob = await convertToWav(originalBlob);

            // 3. Save the new WAV to disk with -realwav suffix
            const realWavKey = `${wordKey}-realwav`;
            await window.electron.saveRecording(realWavKey, await realWavBlob.arrayBuffer());

            // 4. Get the file path for the new WAV
            const audioPath = await window.electron.ipcRenderer.invoke(
                "get-recording-path",
                realWavKey
            );

            // 5. Run the Python process with the new WAV and selected model
            const response = await window.electron.ipcRenderer.invoke(
                "pronunciation-check",
                audioPath,
                modelName
            );

            if (response && response.status === "success") {
                const phonemes = response.phonemes;
                const readablePhonemes = phonemes ? JSON.parse(`"${phonemes}"`) : null;
                setResult(readablePhonemes);
            } else {
                setResult(`Error: ${response?.message || "Unknown error"}`);
                setErrorDetails(response?.traceback || response?.message || "Unknown error");
            }
        } catch (err) {
            setResult(`Error: ${err.message || err}`);
            setErrorDetails(err.stack || err.message || JSON.stringify(err));
        } finally {
            setShowResult(true);
            setLoading(false);
        }
    };

    const parsedPhonemes = parseIPA(displayPronunciation);
    const phoneme = parsedPhonemes.map((syl) => syl.text).join(" ");
    const clean = (str) => (typeof str === "string" ? str.replace(/\s+/g, "") : "");
    // Background logic: compare original model output (result) and official phoneme (spaces removed)
    const phonemeLevenshtein =
        result && phoneme ? levenshtein(clean(result), clean(phoneme)) : null;
    const isClose = phonemeLevenshtein !== null && phonemeLevenshtein <= 1;

    // Display logic: format and highlight aligned model output
    let alignedResult = result;
    let diff = null;
    let rendered = null;
    if (result && phoneme) {
        alignedResult = alignPhonemes(result, phoneme);
        const officialNoSpaces = phoneme.replace(/\s+/g, "");
        const alignedNoSpaces = alignedResult.replace(/\s+/g, "");
        diff = getCharacterDiff(alignedNoSpaces, officialNoSpaces);

        // Render alignedResult with spaces, highlighting differences
        let diffIdx = 0;
        rendered = [];
        for (let i = 0; i < alignedResult.length; i++) {
            const char = alignedResult[i];
            if (char === " ") {
                rendered.push(<span key={`space-${i}`}> </span>);
            } else if (diff && diff[diffIdx]) {
                const d = diff[diffIdx];
                if (d.type === "same") rendered.push(<span key={i}>{char}</span>);
                else if (d.type === "replace")
                    rendered.push(
                        <span key={i} className="bg-warning text-warning-content rounded px-1">
                            {char}
                        </span>
                    );
                else if (d.type === "insert")
                    rendered.push(
                        <span key={i} className="bg-secondary text-secondary-content rounded px-1">
                            {char}
                        </span>
                    );
                else if (d.type === "delete")
                    rendered.push(
                        <span key={i} className="bg-error text-error-content rounded px-1">
                            {char}
                        </span>
                    );
                diffIdx++;
            }
        }
    }

    return (
        <>
            <div className="my-4 flex w-full flex-col items-center gap-2">
                <button
                    type="button"
                    className="btn btn-info"
                    onClick={checkPronunciation}
                    disabled={disabled || loading}
                >
                    {icon} {t("wordPage.pronunciationChecker.checkPronunciationBtn")}
                </button>
            </div>

            <div
                className={`flex justify-center gap-2 overflow-hidden py-4 transition-all duration-500 ease-in-out ${showResult || loading ? "max-h-3/4 opacity-100" : "max-h-0 opacity-0"}`}
            >
                {(showResult || loading) && (
                    <div className="card card-border card-lg w-full shadow-md md:w-2xl dark:border-slate-600">
                        <div className="card-body">
                            <h2 className="card-title">
                                {t("wordPage.pronunciationChecker.pronunciationResult")}
                            </h2>
                            <div className="divider divider-secondary mt-0 mb-4"></div>
                            {loading ? (
                                <div className="my-2 flex flex-col items-center justify-center">
                                    <span className="loading loading-spinner loading-lg"></span>
                                    <span className="my-2">
                                        {progress || t("wordPage.pronunciationChecker.inProgress")}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    {result && result.startsWith && result.startsWith("Error:") ? (
                                        <>
                                            <p className="text-error">
                                                {t("wordPage.pronunciationChecker.errorOccurred")}
                                            </p>
                                            <p className="font-mono">
                                                {result.replace(/^Error:\s*/, "")}
                                            </p>
                                            {errorDetails && (
                                                <div className="flex justify-center">
                                                    <button
                                                        className="link underline"
                                                        type="button"
                                                        onClick={() => setShowErrorDialog(true)}
                                                    >
                                                        {t(
                                                            "wordPage.pronunciationChecker.errorDetails"
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : result === null ? (
                                        <p className="text-warning">
                                            {t("wordPage.pronunciationChecker.cannotHear")}
                                        </p>
                                    ) : (
                                        <>
                                            <p>
                                                <span className="font-bold">
                                                    {t(
                                                        "wordPage.pronunciationChecker.receivedResult"
                                                    )}
                                                </span>{" "}
                                                {diff && diff.length > 0 ? rendered : alignedResult}
                                            </p>
                                            <p>
                                                <span className="font-bold">
                                                    {t(
                                                        "wordPage.pronunciationChecker.correctResult"
                                                    )}
                                                </span>{" "}
                                                {phoneme}
                                            </p>
                                            {phonemeLevenshtein === 0 && (
                                                <p className="text-success">
                                                    {t(
                                                        "wordPage.pronunciationChecker.perfectResult"
                                                    )}
                                                </p>
                                            )}
                                            {isClose && phonemeLevenshtein !== 0 && (
                                                <p className="text-success">
                                                    {t("wordPage.pronunciationChecker.closeResult")}
                                                </p>
                                            )}
                                            {!isClose && phonemeLevenshtein !== 0 && (
                                                <p className="text-warning">
                                                    {t(
                                                        "wordPage.pronunciationChecker.notSoCloseResult"
                                                    )}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-600 italic dark:text-gray-400">
                                                {t("wordPage.pronunciationChecker.disclaimerText")}
                                            </p>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <dialog ref={notInstalledDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {showFailedInstall
                            ? t("wordPage.pronunciationChecker.installationProcessFailed")
                            : t("wordPage.pronunciationChecker.pronunciationCheckerNotInstalled")}
                    </h3>
                    <p className="py-4">
                        {showFailedInstall
                            ? t("wordPage.pronunciationChecker.installationProcessFailedMsg")
                            : t(
                                  "wordPage.pronunciationChecker.pronunciationCheckerNotInstalledMsg"
                              )}
                    </p>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => notInstalledDialogRef.current.close()}
                        >
                            {t("wordPage.pronunciationChecker.okBtn")}
                        </button>
                    </div>
                </div>
            </dialog>

            <dialog ref={webDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t("wordPage.pronunciationChecker.featureNotAvailable")}
                    </h3>
                    <p className="py-4">
                        <Trans
                            i18nKey="wordPage.pronunciationChecker.featureNotAvailableMsg"
                            components={[
                                <button
                                    key="download-link"
                                    type="button"
                                    className="link font-semibold underline"
                                    onClick={() =>
                                        openExternal(
                                            "https://learnercraft.github.io/ispeakerreact/download"
                                        )
                                    }
                                />,
                            ]}
                        />
                    </p>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => webDialogRef.current.close()}
                        >
                            {t("wordPage.pronunciationChecker.okBtn")}
                        </button>
                    </div>
                </div>
            </dialog>

            {/* Error Details Dialog */}
            <dialog
                open={showErrorDialog}
                className="modal"
                onClose={() => setShowErrorDialog(false)}
            >
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t("wordPage.pronunciationChecker.errorDetailsTitle")}
                    </h3>
                    <div className="py-4">
                        <pre className="max-h-64 overflow-auto rounded bg-gray-100 p-4 text-sm break-all whitespace-pre-wrap dark:bg-gray-800">
                            {errorDetails}
                        </pre>
                    </div>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowErrorDialog(false)}
                        >
                            {t("wordPage.pronunciationChecker.okBtn")}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
};

PronunciationChecker.propTypes = {
    icon: PropTypes.node,
    disabled: PropTypes.bool,
    wordKey: PropTypes.string.isRequired,
    displayPronunciation: PropTypes.string,
    modelName: PropTypes.string.isRequired,
    onLoadingChange: PropTypes.func,
};

export default PronunciationChecker;
