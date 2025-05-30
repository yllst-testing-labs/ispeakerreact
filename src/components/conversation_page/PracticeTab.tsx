import { useEffect, useRef, useState } from "react";
import { BsFloppy, BsPlayCircle, BsRecordCircle, BsStopCircle, BsTrash } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import {
    checkRecordingExists,
    openDatabase,
    playRecording,
    saveRecording,
} from "../../utils/databaseOperations.js";
import isElectron from "../../utils/isElectron.js";
import {
    sonnerErrorToast,
    sonnerSuccessToast,
    sonnerWarningToast,
} from "../../utils/sonnerCustomToast.js";

// Define props interface
interface PracticeTabProps {
    accent: string;
    conversationId: string | number;
}

const PracticeTab = ({ accent, conversationId }: PracticeTabProps) => {
    const { t } = useTranslation();

    const [textValue, setTextValue] = useState<string>("");
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isRecordingPlaying, setIsRecordingPlaying] = useState<boolean>(false);
    const [recordingExists, setRecordingExists] = useState<boolean>(false);
    const [currentAudioSource, setCurrentAudioSource] = useState<AudioBufferSourceNode | null>(
        null
    ); // For AudioContext source node
    const [currentAudioElement, setCurrentAudioElement] = useState<HTMLAudioElement | null>(null); // For Audio element (fallback)
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const textKey = `${accent}-${conversationId}-text`;
    const recordingKey = `${accent}-conversation-${conversationId}`;

    // Load saved text from IndexedDB
    useEffect(() => {
        // Load saved text data if exists
        const loadText = async () => {
            const db = await openDatabase();
            const transaction = db.transaction(["conversation_data"]);
            const store = transaction.objectStore("conversation_data");
            const request = store.get(textKey);

            request.onsuccess = () => {
                if (request.result && request.result.text) {
                    setTextValue(request.result.text);
                }
            };
        };
        loadText();
    }, [textKey]);

    // Check if the recording exists in IndexedDB
    useEffect(() => {
        const checkIfRecordingExists = async () => {
            const exists = await checkRecordingExists(recordingKey);
            setRecordingExists(exists);
        };
        checkIfRecordingExists();
    }, [recordingKey]);

    // Auto-expand text area
    const autoExpand = () => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = "auto"; // Reset height to calculate new height
            textArea.style.height = `${textArea.scrollHeight}px`; // Set height to the new calculated height
        }
    };

    // Trigger auto-expand on text change
    useEffect(() => {
        autoExpand();
    }, [textValue]);

    // Save text to IndexedDB
    const handleSaveText = async () => {
        try {
            const db = await openDatabase();
            const transaction = db.transaction(["conversation_data"], "readwrite");
            const store = transaction.objectStore("conversation_data");
            const request = store.put({ id: textKey, text: textValue });

            request.onsuccess = () => {
                sonnerSuccessToast(t("toast.textSaveSuccess"));
            };
            request.onerror = (error: Event) => {
                isElectron() && window.electron.log("error", `Error saving text: ${error}`);
                sonnerErrorToast(
                    t("toast.textSaveFailed") + (error instanceof Error ? error.message : "")
                );
            };
        } catch (error) {
            console.error("Error saving text: ", error);
            isElectron() && window.electron.log("error", `Error saving text: ${error}`);
        }
    };

    // Clear text from IndexedDB
    const handleClearText = async () => {
        try {
            const db = await openDatabase();
            const transaction = db.transaction(["conversation_data"], "readwrite");
            const store = transaction.objectStore("conversation_data");
            const request = store.delete(textKey);

            request.onsuccess = () => {
                setTextValue("");
                sonnerSuccessToast(t("toast.textClearSuccess"));
            };
            request.onerror = (error: Event) => {
                sonnerErrorToast(
                    t("toast.textClearFailed") + (error instanceof Error ? error.message : "")
                );
                isElectron() && window.electron.log("error", `Error clearing text: ${error}`);
            };
        } catch (error) {
            console.error("Error clearing text: ", error);
            isElectron() && window.electron.log("error", `Error clearing text: ${error}`);
            sonnerErrorToast(
                t("toast.textClearFailed") + (error instanceof Error ? error.message : "")
            );
        }
    };

    // Handle recording
    const handleRecording = () => {
        if (!isRecording) {
            // Start recording
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then((stream) => {
                    const recordOptions = {
                        audioBitsPerSecond: 128000,
                    };
                    const mediaRecorder = new MediaRecorder(stream, recordOptions);
                    let audioChunks: Blob[] = [];
                    mediaRecorder.start();
                    setIsRecording(true);
                    setMediaRecorder(mediaRecorder);

                    mediaRecorder.addEventListener("dataavailable", (event: BlobEvent) => {
                        audioChunks.push(event.data);
                        if (mediaRecorder.state === "inactive") {
                            const audioBlob = new Blob(audioChunks, { type: event.data.type });
                            saveRecording(audioBlob, recordingKey, event.data.type);
                            sonnerSuccessToast(t("toast.recordingSuccess"));
                            if (isElectron()) {
                                window.electron.log("log", `Recording saved: ${recordingKey}`);
                            }
                            setRecordingExists(true);
                            audioChunks = [];
                        }
                    });

                    // Auto-stop after 15 minutes
                    setTimeout(
                        () => {
                            if (mediaRecorder.state !== "inactive") {
                                mediaRecorder.stop();
                                sonnerWarningToast(t("toast.recordingExceeded"));
                                setIsRecording(false);
                            }
                        },
                        15 * 60 * 1000
                    );
                })
                .catch((error: Error) => {
                    sonnerErrorToast(t("toast.recordingFailed") + error.message);
                    isElectron() && window.electron.log("error", `Recording failed: ${error}`);
                });
        } else {
            if (mediaRecorder) {
                mediaRecorder.stop();
            }
            setIsRecording(false);
        }
    };

    // Handle playback
    const handlePlayRecording = async () => {
        if (isRecordingPlaying) {
            if (currentAudioSource) {
                currentAudioSource.stop();
                setCurrentAudioSource(null);
            }
            if (currentAudioElement) {
                currentAudioElement.pause();
                currentAudioElement.currentTime = 0;
                setCurrentAudioElement(null);
            }
            setIsRecordingPlaying(false);
        } else {
            playRecording(
                recordingKey,
                (audio: HTMLAudioElement | null, audioSource: AudioBufferSourceNode | null) => {
                    setIsRecordingPlaying(true);
                    if (audioSource) {
                        setCurrentAudioSource(audioSource);
                    } else {
                        setCurrentAudioElement(audio);
                    }
                },
                (error: unknown) => {
                    sonnerErrorToast(
                        t("toast.playbackError") + (error instanceof Error ? error.message : "")
                    );
                    isElectron() && window.electron.log("error", `Error saving text: ${error}`);
                    setIsRecordingPlaying(false);
                },
                () => {
                    setIsRecordingPlaying(false);
                    setCurrentAudioSource(null);
                    setCurrentAudioElement(null);
                }
            );
        }
    };

    return (
        <div className="container-lg mx-auto">
            {Array.isArray(
                t("tabConversationExam.practiceConversationText", { returnObjects: true })
            )
                ? (
                      t("tabConversationExam.practiceConversationText", {
                          returnObjects: true,
                      }) as string[]
                  ).map((text, index) => (
                      <p className="mb-2" key={index}>
                          {text}
                      </p>
                  ))
                : null}

            <fieldset className="fieldset my-4">
                <legend className="fieldset-legend text-sm">
                    {t("tabConversationExam.practiceConversationBox")}
                </legend>
                <textarea
                    className="textarea w-full text-base"
                    ref={textAreaRef}
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    onInput={autoExpand}
                    placeholder={t("tabConversationExam.practiceConversationPlaceholder")}
                    title={t("tabConversationExam.practiceConversationBox")}
                ></textarea>
            </fieldset>

            <div className="flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveText}
                    disabled={!textValue}
                >
                    <BsFloppy className="h-5 w-5" /> {t("buttonConversationExam.saveBtn")}
                </button>
                <button
                    type="button"
                    className="btn btn-error"
                    onClick={handleClearText}
                    disabled={!textValue}
                >
                    <BsTrash className="h-5 w-5" /> {t("buttonConversationExam.clearBtn")}
                </button>
            </div>

            <div className="divider"></div>

            <div className="mt-4">
                <p className="mb-4">{t("tabConversationExam.recordSectionText")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleRecording}
                        disabled={isRecordingPlaying}
                    >
                        {isRecording ? (
                            <>
                                <BsStopCircle className="h-5 w-5" />{" "}
                                {t("buttonConversationExam.stopRecordBtn")}
                            </>
                        ) : (
                            <>
                                <BsRecordCircle className="h-5 w-5" />{" "}
                                {t("buttonConversationExam.recordBtn")}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        className="btn btn-accent"
                        onClick={handlePlayRecording}
                        disabled={!recordingExists || isRecording}
                    >
                        {isRecordingPlaying ? (
                            <>
                                <BsStopCircle className="h-5 w-5" />{" "}
                                {t("buttonConversationExam.stopPlayBtn")}
                            </>
                        ) : (
                            <>
                                <BsPlayCircle className="h-5 w-5" />{" "}
                                {t("buttonConversationExam.playBtn")}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PracticeTab;
