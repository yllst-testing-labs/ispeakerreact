import { useEffect, useState } from "react";
import { IoInformationCircleOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import Container from "../../ui/Container";
import AccentLocalStorage from "../../utils/AccentLocalStorage";
import { isElectron } from "../../utils/isElectron";
import AccentDropdown from "../general/AccentDropdown";
import LoadingOverlay from "../general/LoadingOverlay";
import TopNavBar from "../general/TopNavBar";
import { getFileFromIndexedDB, saveFileToIndexedDB } from "../setting_page/offlineStorageDb";
import ExerciseDetailPage from "./ExerciseDetailPage";

const ExercisePage = () => {
    const { t } = useTranslation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccent, setSelectedAccent] = AccentLocalStorage();
    const [selectedExercise, setSelectedExercise] = useState(null);

    const selectedAccentOptions = [
        { name: "American English", value: "american" },
        { name: "British English", value: "british" },
    ];

    const getLocalizedTitle = (exercise) => {
        if (exercise.titleKey) {
            return t(exercise.titleKey); // Use localization for keys
        }
        return exercise.title;
    };

    const handleSelectExercise = (exercise, heading) => {
        setSelectedExercise({
            id: exercise.id,
            title: getLocalizedTitle(exercise),
            accent: selectedAccentOptions.find((item) => item.value === selectedAccent).name,
            file: exercise.file,
            heading: heading,
        });
    };

    useEffect(() => {
        document.title = `${t("navigation.exercises")} | iSpeakerReact v${__APP_VERSION__}`;
    }, [t]);

    const getInfoText = (exercise, defaultInfoKey) => {
        // If exercise has a specific infoKey, use it. Otherwise, use the general infoKey.
        return exercise.infoKey ? t(exercise.infoKey) : t(defaultInfoKey);
    };

    const TooltipIcon = ({ info, modalId }) => {
        return (
            <>
                {/* Tooltip for larger screens */}
                <div className="tooltip dark:tooltip-accent hidden sm:inline" data-tip={info}>
                    <IoInformationCircleOutline className="h-5 w-5 cursor-pointer hover:text-primary" />
                </div>

                {/* Modal for small screens */}
                <button
                    type="button"
                    title={t("exercise_page.buttons.expandBtn")}
                    className="btn btn-sm btn-info sm:hidden inline focus:ring-2">
                    <IoInformationCircleOutline
                        className="h-5 w-5 cursor-pointer"
                        onClick={() => document.getElementById(modalId).showModal()}
                    />
                </button>
                <dialog id={modalId} className="modal">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">{t("exercise_page.modalInfoHeader")}</h3>
                        <p className="py-4">{info}</p>
                        <div className="modal-action">
                            <form method="dialog">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => document.getElementById(modalId).close()}>
                                    {t("sound_page.closeBtn")}
                                </button>
                            </form>
                        </div>
                    </div>
                </dialog>
            </>
        );
    };

    const ExerciseCard = ({ heading, titles, infoKey, file }) => (
        <div className="card card-bordered dark:border-slate-600 shadow-md flex flex-col justify-between h-auto w-full md:w-1/3 lg:w-1/4">
            <div className="card-body flex-grow">
                <div className="font-semibold card-title">{t(heading)}</div>
                <div className="divider divider-secondary m-0"></div>
                {titles
                    .filter(({ american, british }) => {
                        if (selectedAccent === "american" && american === false) return false;
                        if (selectedAccent === "british" && british === false) return false;
                        return true;
                    })
                    .map((exercise, index) => {
                        const modalId = `exerciseInfoModal-${heading}-${index}`;
                        return (
                            <div key={index} className="flex items-center space-x-2">
                                <a
                                    className="link hover:link-primary"
                                    onClick={() => handleSelectExercise({ ...exercise, file }, heading)}>
                                    {t(exercise.titleKey) || exercise.title}
                                </a>
                                <TooltipIcon info={getInfoText(exercise, infoKey)} modalId={modalId} />
                            </div>
                        );
                    })}
            </div>
        </div>
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // If it's not an Electron environment, check IndexedDB first
                if (!isElectron()) {
                    const cachedDataBlob = await getFileFromIndexedDB("exercise_list.json", "json");

                    if (cachedDataBlob) {
                        // Convert Blob to text, then parse the JSON
                        const cachedDataText = await cachedDataBlob.text();
                        const cachedData = JSON.parse(cachedDataText);

                        setData(cachedData.exerciseList);
                        setLoading(false);

                        return;
                    }
                }

                // If not in IndexedDB or running in Electron, fetch from the network
                const response = await fetch(`${import.meta.env.BASE_URL}json/exercise_list.json`);
                const data = await response.json();

                setData(data.exerciseList);
                setLoading(false);

                // Save the fetched data to IndexedDB (excluding Electron)
                if (!isElectron()) {
                    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                    await saveFileToIndexedDB("exercise_list.json", blob, "json");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Error while loading the data for this section. Please check your Internet connection.");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Save the selected accent to localStorage
        const savedSettings = JSON.parse(localStorage.getItem("ispeaker")) || {};
        savedSettings.selectedAccent = selectedAccent;
        localStorage.setItem("ispeaker", JSON.stringify(savedSettings));
    }, [selectedAccent]);

    const handleGoBack = () => {
        setSelectedExercise(null);
    };

    return (
        <>
            <TopNavBar />
            <Container>
                <h1 className="py-6 text-3xl md:text-4xl font-bold">{t("navigation.exercises")}</h1>
                {selectedExercise ? (
                    <ExerciseDetailPage
                        heading={selectedExercise.heading}
                        id={selectedExercise.id}
                        title={selectedExercise.title}
                        accent={selectedExercise.accent}
                        instructions={selectedExercise.instructions}
                        file={selectedExercise.file}
                        onBack={handleGoBack}
                    />
                ) : (
                    <>
                        <AccentDropdown onAccentChange={setSelectedAccent} />
                        <p className="py-4">{t("exercise_page.exerciseSubheading")}</p>
                        {loading ? (
                            <LoadingOverlay />
                        ) : (
                            <div className="flex flex-wrap justify-center gap-7 mb-10">
                                {data.map((section, index) => (
                                    <ExerciseCard
                                        key={index}
                                        heading={section.heading}
                                        titles={section.titles}
                                        infoKey={section.infoKey}
                                        file={section.file}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </Container>
        </>
    );
};

export default ExercisePage;
