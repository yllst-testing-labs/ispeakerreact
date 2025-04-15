import he from "he";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBackOutline } from "react-icons/io5";
import { MdChecklist, MdKeyboardVoice, MdOutlineOndemandVideo } from "react-icons/md";
import LoadingOverlay from "../general/LoadingOverlay";
import { SoundVideoDialogProvider } from "./hooks/useSoundVideoDialog";
import ReviewCard from "./ReviewCard";
import SoundPracticeCard from "./SoundPracticeCard";
import WatchVideoCard from "./WatchVideoCard";

const PracticeSound = ({ sound, accent, onBack }) => {
    const { t } = useTranslation();
    const [soundsData, setSoundsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("watchTab");

    // Fetch sounds data
    useEffect(() => {
        const fetchSoundsData = async () => {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}json/sounds_data.json`);
                const data = await response.json();
                setSoundsData(data);
            } catch (error) {
                console.error("Error fetching sounds data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSoundsData();
    }, []);

    // Find the sound data using the type and phoneme from sounds_menu.json
    const soundData = soundsData?.[sound.type]?.find((item) => item.id === sound.id);
    const accentData = soundData?.[accent]?.[0];

    const handleReviewUpdate = () => {
        // This function is intentionally empty as the review update is handled by the ReviewCard component
        // We just need to pass a function to trigger the parent component's re-render
    };

    // Show loading while fetching data
    if (loading) {
        return <LoadingOverlay />;
    }

    return (
        <div className="flex flex-wrap gap-5 lg:flex-nowrap">
            <div className="w-full lg:w-1/4">
                <h3 className="mb-2 text-2xl font-semibold">
                    {t("sound_page.soundTop")} <span lang="en">{he.decode(sound.phoneme)}</span>
                </h3>
                <p className="mb-4">
                    {t("accent.accentSettings")}:{" "}
                    {accent === "american" ? t("accent.accentAmerican") : t("accent.accentBritish")}
                </p>
                <div className="divider divider-secondary"></div>
                {accentData && (
                    <>
                        <p className="mb-2 font-semibold">{t("sound_page.exampleWords")}</p>
                        {["initial", "medial", "final"].map((position) => (
                            <p
                                className="mb-2 italic"
                                lang="en"
                                key={position}
                                dangerouslySetInnerHTML={{
                                    __html: he.decode(accentData[position]),
                                }}
                            ></p>
                        ))}
                    </>
                )}
                <button type="button" className="btn btn-secondary my-6" onClick={onBack}>
                    <IoChevronBackOutline className="h-5 w-5" /> {t("sound_page.backBtn")}
                </button>
            </div>
            <div className="w-full lg:w-3/4">
                <div className="bg-base-100 sticky top-[calc(5rem)] z-10 py-4">
                    <div className="flex flex-col items-center">
                        <div role="tablist" className="tabs tabs-box">
                            <a
                                role="tab"
                                onClick={() => setActiveTab("watchTab")}
                                className={`tab md:text-base ${
                                    activeTab === "watchTab" ? "tab-active font-semibold" : ""
                                }`}
                            >
                                <MdOutlineOndemandVideo className="me-1 h-6 w-6" />
                                {t("buttonConversationExam.watchBtn")}
                            </a>
                            <a
                                role="tab"
                                onClick={() => setActiveTab("practieTab")}
                                className={`tab md:text-base ${
                                    activeTab === "practieTab" ? "tab-active font-semibold" : ""
                                }`}
                            >
                                <MdKeyboardVoice className="me-1 h-6 w-6" />
                                {t("buttonConversationExam.practiceBtn")}
                            </a>
                            <a
                                role="tab"
                                onClick={() => setActiveTab("reviewTab")}
                                className={`tab md:text-base ${
                                    activeTab === "reviewTab" ? "tab-active font-semibold" : ""
                                }`}
                            >
                                <MdChecklist className="me-1 h-6 w-6" />
                                {t("buttonConversationExam.reviewBtn")}
                            </a>
                        </div>
                    </div>
                </div>

                <div className="my-4">
                    {activeTab === "watchTab" && (
                        <WatchVideoCard videoData={accentData} accent={accent} t={t} />
                    )}
                    {activeTab === "practieTab" && (
                        <SoundVideoDialogProvider t={t}>
                            <div className="space-y-4">
                                {accentData && (
                                    <>
                                        {/* Main Phoneme Video */}
                                        <SoundPracticeCard
                                            key="main"
                                            textContent={sound.phoneme}
                                            videoUrl={accentData.mainOnlineVideo}
                                            offlineVideo={accentData.mainOfflineVideo}
                                            accent={accent}
                                            t={t}
                                            phoneme={sound.phoneme}
                                            phonemeId={sound.id}
                                            index={0}
                                            type={
                                                sound.type === "consonants"
                                                    ? "constant"
                                                    : sound.type === "vowels"
                                                      ? "vowel"
                                                      : "dipthong"
                                            }
                                        />
                                        {/* Practice Videos */}
                                        {["initial", "medial", "final"].map(
                                            (position, index) =>
                                                accentData[position] && (
                                                    <SoundPracticeCard
                                                        key={position}
                                                        textContent={accentData[position]}
                                                        videoUrl={
                                                            accentData.practiceOnlineVideos[
                                                                index + 1
                                                            ]
                                                        }
                                                        offlineVideo={
                                                            accentData.practiceOfflineVideos[
                                                                index + 1
                                                            ]
                                                        }
                                                        accent={accent}
                                                        t={t}
                                                        phoneme={sound.phoneme}
                                                        phonemeId={sound.id}
                                                        index={index + 1}
                                                        type={
                                                            sound.type === "consonants"
                                                                ? "constant"
                                                                : sound.type === "vowels"
                                                                  ? "vowel"
                                                                  : "dipthong"
                                                        }
                                                    />
                                                )
                                        )}
                                    </>
                                )}
                            </div>
                        </SoundVideoDialogProvider>
                    )}
                    {activeTab === "reviewTab" && (
                        <ReviewCard
                            sound={sound}
                            accent={accent}
                            t={t}
                            onReviewUpdate={handleReviewUpdate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

PracticeSound.propTypes = {
    sound: PropTypes.shape({
        phoneme: PropTypes.string.isRequired,
        word: PropTypes.string.isRequired,
        british: PropTypes.bool.isRequired,
        american: PropTypes.bool.isRequired,
        id: PropTypes.number.isRequired,
        type: PropTypes.oneOf(["consonants", "vowels", "diphthongs"]).isRequired,
    }).isRequired,
    accent: PropTypes.oneOf(["british", "american"]).isRequired,
    onBack: PropTypes.func.isRequired,
};

export default PracticeSound;
