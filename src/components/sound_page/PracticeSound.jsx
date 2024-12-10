import he from "he";
import { useCallback, useEffect, useState } from "react";
import { BsArrowLeftCircle, BsRecordCircleFill } from "react-icons/bs";
import { IoInformationCircleOutline } from "react-icons/io5";
import { MdOutlineOndemandVideo, MdKeyboardVoice, MdChecklist } from "react-icons/md";

import { Trans, useTranslation } from "react-i18next";
import { checkRecordingExists } from "../../utils/databaseOperations";
import { isElectron } from "../../utils/isElectron";
import LoadingOverlay from "../general/LoadingOverlay";
import ReviewCard from "./ReviewCard";
import SoundPracticeCard from "./SoundPracticeCard";
import { usePlaybackFunction } from "./hooks/usePlaybackFunction";
import { useRecordingFunction } from "./hooks/useRecordingFunction";
import { useSoundVideoMapping } from "./hooks/useSoundVideoMapping";
import { WatchVideoCard } from "./WatchVideoCard";

const PracticeSound = ({ sound, accent, onBack, index, soundsData }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("watchTab");

    const accentKey = accent === "american" ? "a" : "b";
    const accentData = sound[accentKey][0];

    const findPhonemeDetails = useCallback(
        (phoneme) => {
            let phonemeIndex = soundsData.consonants.findIndex((p) => p.phoneme === phoneme);
            if (phonemeIndex !== -1) return { index: phonemeIndex, type: "consonant" };

            phonemeIndex = soundsData.vowels_n_diphthongs.findIndex((p) => p.phoneme === phoneme);
            if (phonemeIndex !== -1) return { index: phonemeIndex, type: "vowel" };

            return { index: -1, type: null };
        },
        [soundsData.consonants, soundsData.vowels_n_diphthongs]
    );

    const { index: phonemeIndex, type } = findPhonemeDetails(sound.phoneme);

    const { videoUrls, videoUrl, videoLoading } = useSoundVideoMapping(type, accent, soundsData, phonemeIndex);

    const imgPhonemeThumbSrc =
        accent === "american"
            ? `${import.meta.env.BASE_URL}images/ispeaker/sound_images/sounds_american.jpg`
            : `${import.meta.env.BASE_URL}images/ispeaker/sound_images/sounds_british.jpg`;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Video modals

    const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
    const [selectedVideoModalIndex, setSelectedVideoModalIndex] = useState("");

    const handleShow = (videoIndex) => {
        setSelectedVideoModalIndex(videoIndex);
        setSelectedVideoUrl(videoUrls[videoIndex]);
        setIframeLoadingStates((prevStates) => ({
            ...prevStates,
            modalIframe: true, // Reset the modal iframe loading state to true when modal is opened
        }));
        document.getElementById("sound_video_modal").showModal();
    };

    // iframe loading
    const [iframeLoadingStates, setIframeLoadingStates] = useState({
        mainIframe: true,
        modalIframe: true,
    });

    const handleIframeLoad = (iframeKey) => {
        setIframeLoadingStates((prevStates) => ({
            ...prevStates,
            [iframeKey]: false,
        }));
    };

    // Recording & playback

    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
    const [activeRecordingCard, setActiveRecordingCard] = useState(null);
    const [recordingAvailability, setRecordingAvailability] = useState({});
    const [playingRecordings, setPlayingRecordings] = useState({});
    const [activePlaybackCard, setActivePlaybackCard] = useState(null);

    const [currentAudioSource, setCurrentAudioSource] = useState(null); // For AudioContext source node
    const [currentAudioElement, setCurrentAudioElement] = useState(null); // For Audio element (fallback)

    const { getRecordingKey, isRecordingPlayingActive, isRecordingAvailable, handleRecording } = useRecordingFunction(
        activeRecordingCard,
        setActiveRecordingCard,
        setIsRecording,
        setMediaRecorder,
        setRecordingAvailability,
        isRecording,
        mediaRecorder,
        findPhonemeDetails,
        sound,
        accent,
        recordingAvailability,
        playingRecordings
    );

    useEffect(() => {
        // Assume checkRecordingExists is a function that checks if a recording exists and returns a promise that resolves to a boolean
        const checks = [];
        for (let i = 1; i <= 4; i++) {
            const key = getRecordingKey(i);
            checks.push(checkRecordingExists(key).then((exists) => ({ key, exists })));
        }

        Promise.all(checks).then((results) => {
            const newAvailability = results.reduce((acc, { key, exists }) => {
                acc[key] = exists;
                return acc;
            }, {});
            setRecordingAvailability(newAvailability);
        });
    }, [getRecordingKey]);

    const handlePlayRecording = usePlaybackFunction(
        getRecordingKey,
        isRecordingPlaying,
        activePlaybackCard,
        currentAudioSource,
        setCurrentAudioSource,
        currentAudioElement,
        setCurrentAudioElement,
        setIsRecordingPlaying,
        setActivePlaybackCard,
        setPlayingRecordings
    );

    useEffect(() => {
        // Cleanup function to stop recording and playback
        return () => {
            // Stop the recording if it's active
            if (isRecording && mediaRecorder) {
                mediaRecorder.stop();
                setIsRecording(false);
            }

            // Stop AudioContext playback
            if (currentAudioSource) {
                try {
                    currentAudioSource.stop();
                } catch (error) {
                    console.error("Error stopping AudioContext source during cleanup:", error);
                }
                setCurrentAudioSource(null);
            }

            // Stop Audio element playback
            if (currentAudioElement) {
                currentAudioElement.pause();
                currentAudioElement.currentTime = 0;
                setCurrentAudioElement(null);
            }
        };
    }, [isRecording, mediaRecorder, currentAudioSource, currentAudioElement]);

    if (!videoUrl) {
        return <LoadingOverlay />;
    }

    return (
        <>
            <div className="flex flex-wrap lg:flex-nowrap gap-5">
                <div className="w-full lg:w-1/4">
                    <h3 className="text-2xl font-semibold mb-2">
                        {t("sound_page.soundTop")} {he.decode(sound.phoneme)}
                    </h3>
                    <p className="mb-4">
                        {t("accent.accentSettings")}:{" "}
                        {accent == "american" ? t("accent.accentAmerican") : t("accent.accentBritish")}
                    </p>
                    {accentData && (
                        <>
                            <p className="font-semibold mb-2">{t("sound_page.exampleWords")}</p>
                            {["initial", "medial", "final"].map((position) => (
                                <p
                                    className="italic mb-2"
                                    key={position}
                                    dangerouslySetInnerHTML={{ __html: he.decode(accentData[position]) }}></p>
                            ))}
                        </>
                    )}
                    <button className="btn btn-secondary my-6" onClick={onBack}>
                        <BsArrowLeftCircle /> {t("sound_page.backBtn")}
                    </button>
                </div>
                <div className="w-full lg:w-3/4">
                    <div className="sticky top-[calc(5rem)] z-10 bg-base-100 py-4">
                        <div className="flex flex-col items-center">
                            {/* Menu */}
                            <ul className="menu menu-horizontal bg-base-200 dark:bg-slate-600 rounded-box w-auto">
                                <li>
                                    <button
                                        onClick={() => setActiveTab("watchTab")}
                                        className={`md:text-base ${
                                            activeTab === "watchTab" ? "active font-semibold" : ""
                                        }`}>
                                        <MdOutlineOndemandVideo className="md:h-6 md:w-6" /> Watch
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => setActiveTab("practieTab")}
                                        className={`md:text-base ${
                                            activeTab === "practieTab" ? "active font-semibold" : ""
                                        }`}>
                                        <MdKeyboardVoice className="md:h-6 md:w-6" /> Practice
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => setActiveTab("reviewTab")}
                                        className={`md:text-base ${
                                            activeTab === "reviewTab" ? "active font-semibold" : ""
                                        }`}>
                                        <MdChecklist className="md:h-6 md:w-6" /> Review
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                        {activeTab === "watchTab" && (
                            <WatchVideoCard
                                videoUrl={videoUrl}
                                iframeLoadingStates={iframeLoadingStates}
                                t={t}
                                handleIframeLoad={handleIframeLoad}
                            />
                        )}
                        {activeTab === "practieTab" && (
                            <div className="card card-bordered dark:border-slate-600 shadow-md w-full mb-6">
                                <div className="card-body">
                                    <p className="mb-2">
                                        <Trans
                                            i18nKey="sound_page.recordInstructions"
                                            components={[
                                                <BsRecordCircleFill
                                                    className="inline-block"
                                                    key="0"
                                                    aria-label="record icon"
                                                />,
                                            ]}
                                        />
                                    </p>
                                    <SoundPracticeCard
                                        sound={sound}
                                        handleShow={handleShow}
                                        imgPhonemeThumbSrc={imgPhonemeThumbSrc}
                                        activeRecordingCard={activeRecordingCard}
                                        isRecordingPlaying={isRecordingPlaying}
                                        activePlaybackCard={activePlaybackCard}
                                        accentData={accentData}
                                        isRecordingPlayingActive={isRecordingPlayingActive}
                                        isRecordingAvailable={isRecordingAvailable}
                                        handleRecording={handleRecording}
                                        handlePlayRecording={handlePlayRecording}
                                    />
                                </div>
                            </div>
                        )}
                        {activeTab === "reviewTab" && (
                            <ReviewCard sound={sound} accent={accent} index={index} soundsData={soundsData} />
                        )}
                    </div>
                </div>
            </div>

            <dialog id="sound_video_modal" className="modal">
                <div
                    className={`modal-box w-full max-w-3xl ${
                        iframeLoadingStates.modalIframe ? "overflow-hidden" : ""
                    }`}>
                    <h3 className="font-bold text-lg">
                        {t("sound_page.clipModalTitle")} #{selectedVideoModalIndex}
                    </h3>
                    <div className="py-4">
                        <div className="aspect-video">
                            <div className="w-full h-full">
                                {isElectron() && selectedVideoUrl.includes("localhost:8998") ? (
                                    <video controls className="w-full h-full">
                                        <source src={selectedVideoUrl} type="video/mp4" />
                                    </video>
                                ) : (
                                    selectedVideoUrl && (
                                        <>
                                            {iframeLoadingStates.modalIframe && (
                                                <div className="skeleton h-full w-full"></div>
                                            )}
                                            <iframe
                                                src={selectedVideoUrl}
                                                title="Phoneme Video"
                                                allowFullScreen
                                                onLoad={() => handleIframeLoad("modalIframe")}
                                                style={{
                                                    visibility: iframeLoadingStates.modalIframe ? "hidden" : "visible",
                                                }}
                                                className="w-full h-full"></iframe>
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    {isElectron() && !selectedVideoUrl.startsWith("http://localhost") && (
                        <div role="alert" className="alert mt-5">
                            <IoInformationCircleOutline className="h-6 w-6" />
                            <span>{t("alert.alertOnlineVideo")}</span>
                        </div>
                    )}
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

export default PracticeSound;
