import PropTypes from "prop-types";
import { useRef, useState, useEffect } from "react";
import { isElectron } from "../../utils/isElectron";
import { convertToWav } from "../../utils/ffmpegWavConverter";

const PronunciationChecker = ({ icon, disabled, wordKey }) => {
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
        window.electron?.ipcRenderer?.on?.("pronunciation-model-progress", handler);
        return () => {
            window.electron?.ipcRenderer?.removeListener?.("pronunciation-model-progress", handler);
        };
    }, []);

    useEffect(() => {
        if (showResult) setProgress("");
    }, [showResult]);

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

            // 5. Run the Python process with the new WAV
            const response = await window.electron.ipcRenderer.invoke(
                "pronunciation-check",
                audioPath
            );

            console.log(response);

            if (response && response.status === "success") {
                const phonemes = response.phonemes;
                const readablePhonemes = phonemes ? JSON.parse(`"${phonemes}"`) : "(none)";
                setResult(`Phonemes: ${readablePhonemes}`);
                console.log(response.phonemes);
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

    return (
        <>
            <div className="my-4 flex w-full flex-col items-center gap-2">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={checkPronunciation}
                    disabled={disabled || loading}
                >
                    {icon} Check pronunciation
                </button>
            </div>

            {loading && (
                <div className="my-2 flex flex-col items-center justify-center">
                    <span className="loading loading-spinner loading-lg"></span>
                    <span className="ml-2">
                        {progress || "Converting and checking pronunciation..."}
                    </span>
                </div>
            )}

            <div
                className={`flex justify-center gap-2 overflow-hidden pt-4 transition-all duration-500 ease-in-out ${showResult ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
            >
                {result && (
                    <div className="card card-border card-lg w-full shadow-sm md:w-2xl dark:border-slate-600">
                        <div className="card-body">
                            <h2 className="card-title">Pronunciation result</h2>
                            <div className="divider divider-secondary mt-0 mb-4"></div>
                            <p>{result}</p>
                        </div>
                    </div>
                )}
            </div>

            <dialog ref={dialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">Pronunciation Checker Not Installed</h3>
                    <p className="py-4">
                        Please go to settings and install the Pronunciation Checker files.
                    </p>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => dialogRef.current.close()}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </dialog>

            <dialog ref={webDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">Feature Not Available</h3>
                    <p className="py-4">This feature is not available in the web version.</p>
                    <div className="modal-action">
                        <button
                            className="btn btn-primary"
                            onClick={() => webDialogRef.current.close()}
                        >
                            OK
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
};

export default PronunciationChecker;
