import WavesurferPlayer from "@wavesurfer/react";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { BsPauseFill, BsPlayFill } from "react-icons/bs";
import { IoChevronBackOutline, IoInformationCircleOutline } from "react-icons/io5";
import AccentDropdown from "../general/AccentDropdown";
import { parseIPA } from "./syllableParser";
import SpeechRecognitionTest from "./SpeechRecognitionTest";

const WordDetails = ({ word, handleBack, t }) => {
    const [accent, setAccent] = useState("british");
    const [activeSyllable, setActiveSyllable] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [, setAudioError] = useState(false);
    const [peaks, setPeaks] = useState([]);
    const [isSlowMode, setIsSlowMode] = useState(false);

    const baseURL = import.meta.env.BASE_URL;
    const audioFile =
        accent === "american" && word.fileNameUS
            ? `${baseURL}media/word/mp3/${word.fileNameUS}.mp3`
            : `${baseURL}media/word/mp3/${word.fileName}.mp3`;

    useEffect(() => {
        const storedSettings = JSON.parse(localStorage.getItem("ispeaker"));
        if (storedSettings?.selectedAccent === "american") {
            setAccent("american");
        }
    }, []);

    const displayName = accent === "american" && word.nameUS ? word.nameUS : word.name;
    const displayPronunciation =
        accent === "american" && word.pronunciationUS ? word.pronunciationUS : word.pronunciation;

    const syllables = parseIPA(displayPronunciation);

    const wordPronunInfoBody = t("wordPage.wordPronunInfoBody", { returnObjects: true });

    const [wavesurfer, setWavesurfer] = useState(null);

    const onReady = (ws) => {
        setWavesurfer(ws);
        setIsPlaying(false);
        setAudioError(false);

        // Generate peaks using exportPeaks
        const peaks = ws.exportPeaks({
            maxLength: 1000, // Higher values for better resolution
            precision: 2, // Precision of peak data
        });

        setPeaks(peaks[0] || []); // Use the first channel's peaks

        ws.on("finish", () => {
            setActiveSyllable(-1); // Reset the highlighting
        });

        ws.setPlaybackRate(isSlowMode ? 0.5 : 1);
    };

    const onPlayPause = () => {
        if (wavesurfer) {
            wavesurfer.playPause();
        } else {
            console.error("WaveSurfer instance is not ready.");
        }
    };

    const onAudioprocess = (currentTime) => {
        if (peaks.length > 0 && wavesurfer) {
            const duration = wavesurfer.getDuration();
            const totalPeaks = peaks.length;

            // Calculate current peak index based on playback time
            const currentPeakIndex = Math.floor((currentTime / duration) * totalPeaks);

            // Map the current peak index to syllables
            const syllableIndex = Math.floor(
                (currentPeakIndex / totalPeaks) * (syllables.length + 2)
            );

            if (syllableIndex !== activeSyllable && syllableIndex < syllables.length) {
                setActiveSyllable(syllableIndex);
            }
        }
    };

    const toggleSlowMode = () => {
        if (wavesurfer) {
            const newRate = isSlowMode ? 1 : 0.5; // Normal speed vs Slow speed
            wavesurfer.setPlaybackRate(newRate);
            setIsSlowMode(!isSlowMode);
        }
    };

    return (
        <>
            <AccentDropdown onAccentChange={setAccent} />

            <button className="btn btn-secondary my-8" onClick={handleBack}>
                <IoChevronBackOutline className="h-5 w-5" /> {t("wordPage.backBtn")}
            </button>
            <div className="card card-bordered p-6 shadow-md dark:border-slate-600">
                <div className="card-body flex justify-center text-center">
                    <h1 className="text-2xl font-bold" lang="en">
                        {displayName}{" "}
                        <span className="text-base font-normal italic">{word.pos.join(", ")}</span>
                    </h1>

                    <div className="flex flex-wrap items-center justify-center space-x-2">
                        {syllables.map((syllable, index) => (
                            <div
                                key={index}
                                className={`my-4 ${
                                    syllable.primary || syllable.secondary ? "indicator" : ""
                                }`}
                            >
                                {syllable.primary && (
                                    <span className="badge indicator-item badge-warning">P</span>
                                )}
                                {syllable.secondary && (
                                    <span className="badge indicator-item badge-accent indicator-start">
                                        S
                                    </span>
                                )}
                                <button
                                    type="button"
                                    className={`btn btn-lg ${
                                        index === activeSyllable
                                            ? "btn-accent"
                                            : syllable.primary
                                              ? "btn-primary"
                                              : syllable.secondary
                                                ? "btn-secondary"
                                                : ""
                                    }`}
                                >
                                    {syllable.text}
                                </button>
                            </div>
                        ))}

                        <button type="button" title={t("wordPage.wordPronunInfoHeader")}>
                            <IoInformationCircleOutline
                                className="h-6 w-6"
                                onClick={() =>
                                    document.getElementById("wordPronunInfoModal").showModal()
                                }
                            />
                        </button>
                    </div>

                    <div className="my-4 flex justify-center">
                        <div className="form-control">
                            <label className="label cursor-pointer">
                                <span className="label-text">{t("wordPage.slowModeOption")}</span>
                                <input
                                    type="checkbox"
                                    className="toggle ms-4"
                                    onChange={toggleSlowMode}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Waveform */}
                    <div className="flex w-full place-items-center justify-center space-x-4">
                        <button
                            type="button"
                            title={t("exercise_page.buttons.playAudioBtn")}
                            className="btn btn-circle btn-lg"
                            onClick={onPlayPause}
                        >
                            {isPlaying ? (
                                <BsPauseFill className="h-6 w-6" />
                            ) : (
                                <BsPlayFill className="h-6 w-6" />
                            )}
                        </button>
                        <div className="w-full">
                            <WavesurferPlayer
                                height={80}
                                waveColor="#d1d5db"
                                progressColor="#3b82f6"
                                cursorColor="#1e293b"
                                url={audioFile}
                                onReady={onReady}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onError={() => setAudioError(true)}
                                onAudioprocess={(ws, currentTime) => onAudioprocess(currentTime)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <SpeechRecognitionTest />

            <dialog id="wordPronunInfoModal" className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">{t("wordPage.wordPronunInfoHeader")}</h3>
                    <div className="py-4">
                        {wordPronunInfoBody.map((text, index) => (
                            <p className="mb-2" key={index}>
                                {text}
                            </p>
                        ))}
                    </div>
                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn">{t("sound_page.closeBtn")}</button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    );
};

WordDetails.propTypes = {
    word: PropTypes.shape({
        fileName: PropTypes.string.isRequired,
        fileNameUS: PropTypes.string,
        level: PropTypes.arrayOf(PropTypes.string).isRequired,
        name: PropTypes.string.isRequired,
        nameUS: PropTypes.string,
        pos: PropTypes.arrayOf(PropTypes.string).isRequired,
        pronunciation: PropTypes.string.isRequired,
        pronunciationUS: PropTypes.string,
        wordId: PropTypes.number.isRequired,
    }).isRequired,
    handleBack: PropTypes.func.isRequired,
    t: PropTypes.func.isRequired,
};

export default WordDetails;
