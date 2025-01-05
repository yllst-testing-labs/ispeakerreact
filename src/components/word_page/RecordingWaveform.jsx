import { useWavesurfer } from "@wavesurfer/react";
import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { BsPauseFill, BsPlayFill, BsRecordFill, BsStopFill } from "react-icons/bs";
import RecordPlugin from "wavesurfer.js/dist/plugins/record";
import { checkRecordingExists, openDatabase, saveRecording } from "../../utils/databaseOperations";

const RecordingWaveform = ({
    wordKey,
    maxDuration,
    disableControls = false,
    onActivityChange = null,
    t,
}) => {
    const containerRef = useRef(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [, setRecordingTime] = useState(0);
    const recordingInterval = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [playEnabled, setPlayEnabled] = useState(false);

    const { wavesurfer, isPlaying } = useWavesurfer({
        container: containerRef,
        height: 80,
        waveColor: "#ddd",
        progressColor: "#ff006c",
        cursorWidth: 2,
        url: audioUrl,
    });

    const notifyActivityChange = useCallback(
        (isActive) => {
            if (onActivityChange) {
                onActivityChange(isActive);
            }
        },
        [onActivityChange]
    );

    const recordPluginRef = useRef(null);

    const loadExistingRecording = useCallback(async () => {
        const exists = await checkRecordingExists(wordKey);
        if (exists) {
            console.log(`Recording found for key: ${wordKey}`);
            const db = await openDatabase();
            const transaction = db.transaction(["recording_data"], "readonly");
            const store = transaction.objectStore("recording_data");
            const request = store.get(wordKey);

            request.onsuccess = () => {
                const { recording } = request.result;
                const blob = new Blob([recording], { type: "audio/wav" });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setPlayEnabled(true);
            };
        } else {
            console.log(`No recording found for key: ${wordKey}`);
            setPlayEnabled(false);
        }
    }, [wordKey]);

    const startRecording = async () => {
        if (disableControls) return;

        const recordPlugin = recordPluginRef.current;
        if (!recordPlugin) {
            console.error("RecordPlugin not initialized");
            return;
        }

        if (isRecording) {
            console.log("Stopping recording...");
            recordPlugin.stopRecording();
            setIsRecording(false);
            setPlayEnabled(true);
            notifyActivityChange(false);
            return;
        }

        const devices = await RecordPlugin.getAvailableAudioDevices();
        const deviceId = devices[0]?.deviceId;

        if (!deviceId) {
            console.error("No audio input devices found");
            return;
        }

        //wavesurfer.empty(); // Clear the existing waveform
        console.log("Starting recording...");
        recordPlugin.startRecording({ deviceId });
        setIsRecording(true);
        setPlayEnabled(false);
        notifyActivityChange(true);

        recordingInterval.current = setInterval(() => {
            setRecordingTime((prevTime) => {
                if (prevTime >= maxDuration) {
                    console.log("Max recording duration reached. Stopping...");
                    recordPlugin.stopRecording();
                    setIsRecording(false);
                    clearInterval(recordingInterval.current);
                    notifyActivityChange(false);
                    return prevTime;
                }
                return prevTime + 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (wavesurfer && !recordPluginRef.current) {
            const recordPlugin = wavesurfer.registerPlugin(
                RecordPlugin.create({
                    scrollingWaveform: true,
                    renderRecordedAudio: true,
                    continuousWaveform: true,
                    continuousWaveformDuration: maxDuration,
                })
            );
            recordPluginRef.current = recordPlugin;

            recordPlugin.on("record-end", async (blob) => {
                if (blob.size === 0) {
                    console.error("Recording failed: Blob is empty");
                    return;
                }
                clearInterval(recordingInterval.current);
                setRecordingTime(0);

                const recordedUrl = URL.createObjectURL(blob);
                setAudioUrl(recordedUrl);

                try {
                    await saveRecording(blob, wordKey);
                    console.log("Recording saved successfully");
                } catch (error) {
                    console.error("Error saving recording:", error);
                }

                setPlayEnabled(true);
            });
        }

        return () => {
            recordPluginRef.current?.destroy();
        };
    }, [wavesurfer, wordKey, maxDuration]);

    useEffect(() => {
        if (wavesurfer) {
            // Listen for playback finish event
            wavesurfer.on("finish", () => {
                notifyActivityChange(false); // Notify parent when playback ends
            });
        }

        return () => {
            wavesurfer?.un("finish"); // Cleanup event listener
        };
    }, [wavesurfer, notifyActivityChange]);

    useEffect(() => {
        loadExistingRecording();
    }, [loadExistingRecording]);

    const onPlayPause = useCallback(() => {
        if (disableControls || !wavesurfer) return;

        if (wavesurfer) {
            const isNowPlaying = !isPlaying;
            wavesurfer.playPause();
            notifyActivityChange(isNowPlaying);
            setIsRecording(false);
        }
    }, [wavesurfer, disableControls, isPlaying, notifyActivityChange]);

    useEffect(() => {
        return () => {
            clearInterval(recordingInterval.current);
            wavesurfer?.destroy();
        };
    }, [wavesurfer]);

    return (
        <div className="my-4">
            <div className="w-full">
                <div ref={containerRef}></div>
            </div>
            <div className="flex w-full place-items-center justify-center space-x-4">
                <button
                    title={
                        isRecording
                            ? t("buttonConversationExam.stopRecordBtn")
                            : t("buttonConversationExam.recordBtn")
                    }
                    type="button"
                    className="btn btn-circle btn-accent"
                    onClick={startRecording}
                    disabled={isPlaying || disableControls} // Disable while playing
                >
                    {isRecording ? (
                        <BsStopFill className="h-6 w-6" />
                    ) : (
                        <BsRecordFill className="h-6 w-6" />
                    )}
                </button>

                <button
                    title={
                        isPlaying
                            ? t("wordPage.pauseRecordingBtn")
                            : t("buttonConversationExam.playBtn")
                    }
                    type="button"
                    className="btn btn-circle btn-primary"
                    onClick={onPlayPause}
                    disabled={!playEnabled || isRecording || disableControls} // Disable while recording
                >
                    {isPlaying ? (
                        <BsPauseFill className="h-6 w-6" />
                    ) : (
                        <BsPlayFill className="h-6 w-6" />
                    )}
                </button>
            </div>
        </div>
    );
};

RecordingWaveform.propTypes = {
    wordKey: PropTypes.string.isRequired,
    maxDuration: PropTypes.number.isRequired,
    disableControls: PropTypes.bool.isRequired,
    onActivityChange: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
};

export default RecordingWaveform;
