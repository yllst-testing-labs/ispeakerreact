import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { convertToWav } from "../../utils/ffmpegWavConverter";
import { isElectron } from "../../utils/isElectron";
import openExternal from "../../utils/openExternal";
import { arePhonemesClose, normalizeIPAString } from "./ipaUtils";
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
    // Remove all spaces for comparison
    const normalizedResultNoSpaces = normalizeIPAString(result).replace(/ /g, "");
    const normalizedPhonemeNoSpaces = normalizeIPAString(phoneme).replace(/ /g, "");
    // Character-based Levenshtein with fuzzy matching
    function charLevenshtein(a, b) {
        const dp = Array(a.length + 1)
            .fill(null)
            .map(() => Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                if (arePhonemesClose(a[i - 1], b[j - 1])) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1, // deletion
                        dp[i][j - 1] + 1, // insertion
                        dp[i - 1][j - 1] + 1 // substitution
                    );
                }
            }
        }
        return dp[a.length][b.length];
    }
    const phonemeLevenshtein =
        result && phoneme
            ? charLevenshtein(normalizedResultNoSpaces, normalizedPhonemeNoSpaces)
            : null;
    const isClose = phonemeLevenshtein !== null && phonemeLevenshtein <= 1;

    // Utility: format model output to match official phoneme's spacing
    function formatToOfficialSpacing(modelStr, officialStr) {
        // Remove spaces from both
        const model = modelStr.replace(/ /g, "");
        const official = officialStr.trim().split(/\s+/);
        let idx = 0;
        const groups = official.map((syll) => {
            const group = model.slice(idx, idx + syll.length);
            idx += syll.length;
            return group;
        });
        return groups.join(" ");
    }

    // Display logic: format and highlight aligned model output
    let alignedResult = result;
    let diff = null;
    let rendered = null;
    // If too many mistakes, show a try again message
    if (phonemeLevenshtein !== null && phonemeLevenshtein > 5) {
        rendered = <p className="text-accent">{t("wordPage.pronunciationChecker.cannotHear")}</p>;
    } else if (result && phoneme) {
        // Format model output to match official phoneme's spacing
        alignedResult = formatToOfficialSpacing(normalizedResultNoSpaces, phoneme);
        // Build a diff array for rendering (character by character)
        diff = [];
        const modelArr = alignedResult.replace(/ /g, "").split("");
        const officialArr = normalizedPhonemeNoSpaces.split("");
        let i = 0,
            j = 0;
        while (i < modelArr.length && j < officialArr.length) {
            if (arePhonemesClose(modelArr[i], officialArr[j])) {
                diff.push({ type: "same", value: modelArr[i] });
                i++;
                j++;
            } else {
                diff.push({ type: "replace", value: modelArr[i] });
                i++;
                j++;
            }
        }
        while (i < modelArr.length) {
            diff.push({ type: "delete", value: modelArr[i] });
            i++;
        }
        while (j < officialArr.length) {
            diff.push({ type: "insert", value: officialArr[j] });
            j++;
        }
        // Render alignedResult with spaces, highlighting differences
        // Insert spaces to match official phoneme's spacing
        let spaceIdx = 0;
        let charCount = 0;
        const officialSyllables = phoneme.trim().split(/\s+/);
        const syllableBoundaries = officialSyllables.map((syll) => syll.length);
        let currentBoundary = syllableBoundaries[spaceIdx] || 0;
        rendered = [];
        for (let idx = 0; idx < diff.length; idx++) {
            const d = diff[idx];
            if (d.type === "same") rendered.push(<span key={idx}>{d.value}</span>);
            if (d.type === "replace")
                rendered.push(
                    <span key={idx} className="bg-info text-info-content rounded px-1">
                        {d.value}
                    </span>
                );
            if (d.type === "insert")
                rendered.push(
                    <span key={idx} className="bg-accent text-accent-content rounded px-1">
                        {d.value}
                    </span>
                );
            if (d.type === "delete")
                rendered.push(
                    <span key={idx} className="bg-error text-error-content rounded px-1">
                        {d.value}
                    </span>
                );
            charCount++;
            if (charCount === currentBoundary && idx !== diff.length - 1) {
                rendered.push(<span key={`space-${idx}`}> </span>);
                spaceIdx++;
                currentBoundary += syllableBoundaries[spaceIdx] || 0;
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
                                        <p className="text-accent">
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
                                                {rendered}
                                            </p>
                                            <p>
                                                <span className="font-bold">
                                                    {t(
                                                        "wordPage.pronunciationChecker.correctResult"
                                                    )}
                                                </span>{" "}
                                                {phoneme}
                                            </p>
                                            <p className="font-bold">
                                                {t("wordPage.pronunciationChecker.colorLegend")}
                                            </p>
                                            <ul className="list-inside list-disc">
                                                <li>
                                                    <span className="bg-info text-info-content rounded px-1">
                                                        {t(
                                                            "wordPage.pronunciationChecker.colorLegendMispronounce"
                                                        )}
                                                    </span>
                                                </li>
                                                <li>
                                                    <span className="bg-error text-error-content rounded px-1">
                                                        {t(
                                                            "wordPage.pronunciationChecker.colorLegendExtra"
                                                        )}
                                                    </span>
                                                </li>
                                                <li>
                                                    <span className="bg-accent text-accent-content rounded px-1">
                                                        {t(
                                                            "wordPage.pronunciationChecker.colorLegendMissing"
                                                        )}
                                                    </span>
                                                </li>
                                            </ul>
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
                                                <p className="text-accent">
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
