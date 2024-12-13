import he from "he";
import { Suspense, lazy, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Container from "../../ui/Container";
import AccentLocalStorage from "../../utils/AccentLocalStorage";
import { isElectron } from "../../utils/isElectron";
import AccentDropdown from "../general/AccentDropdown";
import LoadingOverlay from "../general/LoadingOverlay";
import TopNavBar from "../general/TopNavBar";
import { getFileFromIndexedDB, saveFileToIndexedDB } from "../setting_page/offlineStorageDb";
import SoundCardList from "./SoundCardList";

const PracticeSound = lazy(() => import("./PracticeSound"));

const SoundList = () => {
    const { t } = useTranslation();
    const [selectedSound, setSelectedSound] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAccent, setSelectedAccent] = AccentLocalStorage();
    const [activeTab, setActiveTab] = useState("tab1");

    const [soundsData, setSoundsData] = useState({
        consonants: [],
        vowels_n_diphthongs: [],
    });

    const [reviews, setReviews] = useState({});
    const [reviewsUpdateTrigger, setReviewsUpdateTrigger] = useState(0);

    useEffect(() => {
        const fetchReviews = () => {
            const ispeakerData = JSON.parse(localStorage.getItem("ispeaker") || "{}");
            const accentReviews = ispeakerData.soundReview?.[selectedAccent] || {};
            setReviews(accentReviews);
        };
        fetchReviews();
    }, [selectedAccent, reviewsUpdateTrigger]);

    const triggerReviewsUpdate = () => setReviewsUpdateTrigger((prev) => prev + 1);

    const handlePracticeClick = (sound, accent, index) => {
        setSelectedSound({ sound, accent, index });
    };

    const handleGoBack = () => {
        setSelectedSound(null);
        triggerReviewsUpdate();
    };

    const getReviewKey = (sound, index) => {
        const type = soundsData.consonants.some((s) => s.phoneme === sound.phoneme) ? "consonant" : "vowel";
        return `${type}${index + 1}`;
    };

    const getBadgeColor = (sound, index) => {
        const reviewKey = getReviewKey(sound, index);
        const review = reviews[reviewKey];
        return (
            {
                good: "badge-success",
                neutral: "badge-warning",
                bad: "badge-error",
            }[review] || null
        );
    };

    const getReviewText = (review) => {
        switch (review) {
            case "good":
                return t("sound_page.reviewGood");
            case "neutral":
                return t("sound_page.reviewNeutral");
            case "bad":
                return t("sound_page.reviewBad");
            default:
                return "";
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const cachedDataBlob = !isElectron() && (await getFileFromIndexedDB("sounds_data.json", "json"));

                if (cachedDataBlob) {
                    const cachedData = JSON.parse(await cachedDataBlob.text());
                    setSoundsData(cachedData);
                } else {
                    const response = await fetch(`${import.meta.env.BASE_URL}json/sounds_data.json`);
                    const data = await response.json();
                    setSoundsData(data);

                    if (!isElectron()) {
                        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                        await saveFileToIndexedDB("sounds_data.json", blob, "json");
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert(t("sound_page.loadError"));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [t]);

    useEffect(() => {
        document.title = `${t("navigation.sounds")} | iSpeakerReact v${__APP_VERSION__}`;
    }, [t]);

    const filteredSounds = useMemo(() => {
        const currentTabData = activeTab === "tab1" ? soundsData.consonants : soundsData.vowels_n_diphthongs;
        return currentTabData.filter(
            (sound) =>
                (selectedAccent === "british" && sound.b_s === "yes") ||
                (selectedAccent === "american" && sound.a_s === "yes")
        );
    }, [activeTab, selectedAccent, soundsData]);

    return (
        <>
            <TopNavBar />
            <Container>
                <h1 className="py-6 text-3xl md:text-4xl font-bold">{t("navigation.sounds")}</h1>
                {selectedSound ? (
                    <Suspense fallback={isElectron() ? null : <LoadingOverlay />}>
                        <PracticeSound
                            sound={selectedSound.sound}
                            accent={selectedSound.accent}
                            soundsData={soundsData}
                            index={selectedSound.index}
                            onBack={handleGoBack}
                        />
                    </Suspense>
                ) : (
                    <>
                        <AccentDropdown onAccentChange={setSelectedAccent} />
                        <div>
                            {loading ? (
                                <LoadingOverlay />
                            ) : (
                                <>
                                    <div className="sticky top-[calc(5rem)] z-10 py-8 bg-base-100">
                                        <div className="flex justify-center">
                                            <ul className="menu menu-horizontal bg-base-200 dark:bg-base-100 rounded-box w-auto">
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("tab1")}
                                                        className={`md:text-base ${
                                                            activeTab === "tab1" ? "active font-semibold" : ""
                                                        }`}>
                                                        {t("sound_page.consonants")}
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("tab2")}
                                                        className={`md:text-base ${
                                                            activeTab === "tab2" ? "active font-semibold" : ""
                                                        }`}>
                                                        {t("sound_page.vowels_dipthongs")}
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center gap-5 place-items-center my-4">
                                        {filteredSounds.map((sound, index) => (
                                            <SoundCardList
                                                key={index}
                                                sound={sound}
                                                index={index}
                                                selectedAccent={selectedAccent}
                                                handlePracticeClick={handlePracticeClick}
                                                getBadgeColor={getBadgeColor}
                                                getReviewText={getReviewText}
                                                reviews={reviews}
                                                getReviewKey={getReviewKey}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
            </Container>
        </>
    );
};

export default SoundList;
