import { useEffect, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Floppy, PlayCircle, RecordCircle, StopCircle, Trash } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";
import { checkRecordingExists, openDatabase, playRecording, saveRecording } from "../../utils/databaseOperations";
import { isElectron } from "../../utils/isElectron";
import { sonnerErrorToast, sonnerSuccessToast, sonnerWarningToast } from "../../utils/sonnerCustomToast";

const PracticeTab = ({ accent, conversationId }) => {
    const { t } = useTranslation();

    const [textValue, setTextValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
    const [recordingExists, setRecordingExists] = useState(false);
    const [currentAudioSource, setCurrentAudioSource] = useState(null); // For AudioContext source node
    const [currentAudioElement, setCurrentAudioElement] = useState(null); // For Audio element (fallback)
    const textAreaRef = useRef(null);

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

            request.onsuccess = function () {
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
            request.onerror = (error) => {
                isElectron() && window.electron.log("error", `Error saving text: ${error}`);
                sonnerErrorToast(t("toast.textSaveFailed") + error.message);
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
            request.onerror = (error) => {
                sonnerErrorToast(t("toast.textClearFailed") + error.message);
                isElectron() && window.electron.log("error", `Error clearing text: ${error}`);
            };
        } catch (error) {
            console.error("Error clearing text: ", error);
            isElectron() && window.electron.log("error", `Error clearing text: ${error}`);
            sonnerErrorToast(t("toast.textClearFailed") + error.message);
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
                    let audioChunks = [];
                    mediaRecorder.start();
                    setIsRecording(true);
                    setMediaRecorder(mediaRecorder);

                    mediaRecorder.addEventListener("dataavailable", (event) => {
                        audioChunks.push(event.data);
                        if (mediaRecorder.state === "inactive") {
                            const audioBlob = new Blob(audioChunks, { type: event.data.type });
                            saveRecording(audioBlob, recordingKey, event.data.type);
                            sonnerSuccessToast(t("toast.recordingSuccess"));
                            isElectron() && window.electron.log("log", `Recording saved: ${recordingKey}`);

                            setRecordingExists(true);
                            audioChunks = [];
                        }
                    });

                    // Auto-stop after 15 minutes
                    setTimeout(() => {
                        if (mediaRecorder.state !== "inactive") {
                            mediaRecorder.stop();
                            sonnerWarningToast(t("toast.recordingExceeded"));
                            setIsRecording(false);
                        }
                    }, 15 * 60 * 1000);
                })
                .catch((error) => {
                    sonnerErrorToast(t("toast.recordingFailed") + error.message);
                    isElectron() && window.electron.log("error", `Recording failed: ${error}`);
                });
        } else {
            // Stop recording
            mediaRecorder.stop();
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
                (audio, audioSource) => {
                    setIsRecordingPlaying(true);
                    if (audioSource) {
                        setCurrentAudioSource(audioSource);
                    } else {
                        setCurrentAudioElement(audio);
                    }
                },
                (error) => {
                    sonnerErrorToast(t("toast.playbackError") + error.message);
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
        <>
            {t("tabConversationExam.practiceConversationText", { returnObjects: true }).map((text, index) => (
                <p key={index}>{text}</p>
            ))}

            <Form>
                <Form.Group controlId="practiceText" className="mb-2">
                    <Form.Label>{t("tabConversationExam.practiceConversationBox")}</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        ref={textAreaRef}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        onInput={autoExpand}
                    />
                </Form.Group>
                <Button variant="primary" onClick={handleSaveText} disabled={!textValue}>
                    <Floppy /> {t("buttonConversationExam.saveBtn")}
                </Button>
                <Button variant="danger" onClick={handleClearText} className="ms-2">
                    <Trash /> {t("buttonConversationExam.clearBtn")}
                </Button>
            </Form>

            <div className="mt-4">
                <p>{t("tabConversationExam.recordSectionText")}</p>
                <Button variant="primary" onClick={handleRecording}>
                    {isRecording ? (
                        <>
                            <StopCircle /> {t("buttonConversationExam.stopRecordBtn")}
                        </>
                    ) : (
                        <>
                            <RecordCircle /> {t("buttonConversationExam.recordBtn")}
                        </>
                    )}
                </Button>
                <Button variant="success" onClick={handlePlayRecording} disabled={!recordingExists} className="ms-2">
                    {isRecordingPlaying ? (
                        <>
                            <StopCircle /> {t("buttonConversationExam.stopPlayBtn")}
                        </>
                    ) : (
                        <>
                            <PlayCircle /> {t("buttonConversationExam.playBtn")}
                        </>
                    )}
                </Button>
            </div>
        </>
    );
};

export default PracticeTab;
