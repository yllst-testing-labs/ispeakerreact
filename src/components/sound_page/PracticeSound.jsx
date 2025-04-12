import he from "he";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChevronBackOutline } from "react-icons/io5";
import { MdOutlineOndemandVideo } from "react-icons/md";
import LoadingOverlay from "../general/LoadingOverlay";
import WatchVideoCard from "./WatchVideoCard";

const PracticeSound = ({ sound, accent, onBack }) => {
    const { t } = useTranslation();
    const [soundsData, setSoundsData] = useState(null);
    const [loading, setLoading] = useState(true);

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
                            <a role="tab" className="tab tab-active font-semibold md:text-base">
                                <MdOutlineOndemandVideo className="me-1 h-6 w-6" />
                                {t("buttonConversationExam.watchBtn")}
                            </a>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <WatchVideoCard videoData={accentData} accent={accent} t={t} />
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
