import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { convertToWav } from "../../utils/ffmpegWavConverter";
import { isElectron } from "../../utils/isElectron";
import { getCharacterDiff, levenshtein, alignPhonemes } from "../../utils/levenshtein";
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
    const dialogRef = useRef();
    const webDialogRef = useRef();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState("");

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

    const checkPronunciation = async () => {
        if (!isElectron()) {
            // Show dialog for web
            if (webDialogRef.current) {
                webDialogRef.current.showModal();
            }
            return;
        }
        setLoading(true);
        setProgress("");
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
            }
        } catch (err) {
            setResult(`Error: ${err.message || err}`);
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
        alignedResult = alignPhonemes(result, phoneme); // e.g., "ə bɪ lɪ ti"
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
                className={`flex justify-center gap-2 overflow-hidden py-4 transition-all duration-500 ease-in-out ${showResult || loading ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
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
                                        <p className="text-error">
                                            {t("wordPage.pronunciationChecker.errorOccurred")}
                                            {": "}
                                            {result.replace(/^Error:\s*/, "")}
                                        </p>
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
                                            {isClose && (
                                                <p className="text-success">
                                                    {t("wordPage.pronunciationChecker.closeResult")}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <dialog ref={dialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t("wordPage.pronunciationChecker.pronunciationCheckerNotInstalled")}
                    </h3>
                    <p className="py-4">
                        {t("wordPage.pronunciationChecker.pronunciationCheckerNotInstalledMsg")}
                    </p>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => dialogRef.current.close()}
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
