import he from "he";
import { Suspense, lazy, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Container from "../../ui/Container";
import AccentLocalStorage from "../../utils/AccentLocalStorage";
import { isElectron } from "../../utils/isElectron";
import AccentDropdown from "../general/AccentDropdown";
import LoadingOverlay from "../general/LoadingOverlay";
import TopNavBar from "../general/TopNavBar";
import { getFileFromIndexedDB, saveFileToIndexedDB } from "../setting_page/offlineStorageDb";

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
        consonants_b: [],
        consonants_a: [],
        vowels_b: [],
        vowels_a: [],
    });

    const handlePracticeClick = (sound, accent, index) => {
        setSelectedSound({ sound, accent, index });
    };

    // Trigger re-render when the review option is updated
    const [reviews, setReviews] = useState({});

    const [reviewsUpdateTrigger, setReviewsUpdateTrigger] = useState(0);

    useEffect(() => {
        const ispeakerData = JSON.parse(localStorage.getItem("ispeaker") || "{}");
        const accentReviews = ispeakerData.soundReview ? ispeakerData.soundReview[selectedAccent] || {} : {};
        setReviews(accentReviews);
    }, [selectedAccent, reviewsUpdateTrigger]);

    // Method to trigger re-render
    const triggerReviewsUpdate = () => {
        setReviewsUpdateTrigger(Date.now());
    };

    const handleGoBack = () => {
        setSelectedSound(null);
        triggerReviewsUpdate();
    };

    const getReviewKey = (sound, index) => {
        const type = soundsData.consonants.some((s) => s.phoneme === sound.phoneme) ? "consonant" : "vowel";
        const formattedIndex = index + 1;
        return `${type}${formattedIndex}`;
    };

    const getBadgeColor = (sound, index) => {
        const ispeakerData = JSON.parse(localStorage.getItem("ispeaker") || "{}");
        const accentReviews = ispeakerData.soundReview ? ispeakerData.soundReview[selectedAccent] || {} : {};
        const reviewKey = getReviewKey(sound, index);
        const review = accentReviews[reviewKey];

        const badgeColors = {
            good: "badge-success",
            neutral: "badge-warning",
            bad: "badge-error",
        };

        return badgeColors[review] || null; // Return the Tailwind class or null
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

                // If it's not an Electron environment, check IndexedDB first
                if (!isElectron()) {
                    const cachedDataBlob = await getFileFromIndexedDB("sounds_data.json", "json");

                    if (cachedDataBlob) {
                        // Convert Blob to text, then parse the JSON
                        const cachedDataText = await cachedDataBlob.text();
                        const cachedData = JSON.parse(cachedDataText);

                        setSoundsData(cachedData);
                        setLoading(false);

                        return;
                    }
                }

                // If not in IndexedDB or running in Electron, fetch from the network
                const response = await fetch(`${import.meta.env.BASE_URL}json/sounds_data.json`);
                const data = await response.json();

                setSoundsData(data);
                setLoading(false);

                // Save the fetched data to IndexedDB (excluding Electron)
                if (!isElectron()) {
                    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                    await saveFileToIndexedDB("sounds_data.json", blob, "json");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Error while loading the data for this section. Please check your Internet connection.");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        document.title = `${t("navigation.sounds")} | iSpeakerReact v${__APP_VERSION__}`;
    }, [t]);

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
                            onBack={() => handleGoBack()}
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
                                            {/* Menu */}
                                            <ul className="menu menu-horizontal bg-base-200 dark:bg-slate-600 rounded-box w-auto">
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("tab1")}
                                                        className={`md:text-base ${
                                                            activeTab === "tab1" ? "active" : ""
                                                        }`}>
                                                        {t("sound_page.consonants")}
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab("tab2")}
                                                        className={`md:text-base ${
                                                            activeTab === "tab2" ? "active" : ""
                                                        }`}>
                                                        {t("sound_page.vowels_dipthongs")}
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    {/* Tab Content */}
                                    <div className="mt-4">
                                        {activeTab === "tab1" && (
                                            <>
                                                <div className="flex flex-wrap justify-center gap-7 mb-10">
                                                    {soundsData.consonants
                                                        .filter(
                                                            (sound) =>
                                                                (selectedAccent === "british" && sound.b_s === "yes") ||
                                                                (selectedAccent === "american" && sound.a_s === "yes")
                                                        )
                                                        .map((sound, index) => (
                                                            <div key={index} className="indicator">
                                                                {getBadgeColor(sound, index) && (
                                                                    <span
                                                                        className={`indicator-item indicator-center badge ${getBadgeColor(
                                                                            sound,
                                                                            index
                                                                        )}`}>
                                                                        {getReviewText(
                                                                            reviews[`${getReviewKey(sound, index)}`]
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <div className="card card-bordered dark:border-slate-600 shadow-md flex flex-col justify-between h-auto pb-6">
                                                                    <div className="card-body items-center text-center flex-grow">
                                                                        <h2 className="card-title">
                                                                            {he.decode(sound.phoneme)}{" "}
                                                                        </h2>
                                                                        <p>{sound.example_word}</p>
                                                                    </div>
                                                                    <div className="card-actions px-6">
                                                                        <button
                                                                            className="btn btn-primary w-full"
                                                                            onClick={() =>
                                                                                handlePracticeClick(
                                                                                    sound,
                                                                                    selectedAccent,
                                                                                    index
                                                                                )
                                                                            }
                                                                            aria-label={`Open the sound ${he.decode(
                                                                                sound.phoneme
                                                                            )}`}>
                                                                            {t("sound_page.practiceBtn")}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </>
                                        )}
                                        {activeTab === "tab2" && (
                                            <>
                                                <div className="flex flex-wrap justify-center gap-7 mb-10">
                                                    {soundsData.vowels_n_diphthongs
                                                        .filter(
                                                            (sound) =>
                                                                (selectedAccent === "british" && sound.b_s === "yes") ||
                                                                (selectedAccent === "american" && sound.a_s === "yes")
                                                        )
                                                        .map((sound, index) => (
                                                            <div key={index} className="indicator">
                                                                {getBadgeColor(sound, index) && (
                                                                    <span
                                                                        className={`indicator-item indicator-center badge ${getBadgeColor(
                                                                            sound,
                                                                            index
                                                                        )}`}>
                                                                        {getReviewText(
                                                                            reviews[`${getReviewKey(sound, index)}`]
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <div className="card card-bordered dark:border-slate-600 shadow-md flex flex-col justify-between h-auto pb-6">
                                                                    <div className="card-body items-center text-center flex-grow">
                                                                        <h2 className="card-title">
                                                                            {he.decode(sound.phoneme)}
                                                                        </h2>
                                                                        <p>{sound.example_word}</p>
                                                                    </div>
                                                                    <div className="card-actions px-6">
                                                                        <button
                                                                            className="btn btn-primary w-full"
                                                                            onClick={() =>
                                                                                handlePracticeClick(
                                                                                    sound,
                                                                                    selectedAccent,
                                                                                    index
                                                                                )
                                                                            }>
                                                                            {t("sound_page.practiceBtn")}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </>
                                        )}
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
