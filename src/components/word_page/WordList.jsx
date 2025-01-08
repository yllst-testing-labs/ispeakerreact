import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoInformationCircleOutline } from "react-icons/io5";
import Container from "../../ui/Container";
import AccentLocalStorage from "../../utils/AccentLocalStorage";
import AccentDropdown from "../general/AccentDropdown";
import TopNavBar from "../general/TopNavBar";
import Pagination from "./Pagination";
import WordDetails from "./WordDetails";

const PronunciationPractice = () => {
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState("oxford3000");
    const [words, setWords] = useState([]);
    const [reviewData, setReviewData] = useState({});
    const [accent, setAccent] = AccentLocalStorage();
    const [loading, setLoading] = useState(false);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 18;

    // View state
    const [viewState, setViewState] = useState("list");
    const [selectedWord, setSelectedWord] = useState(null);

    // Derived data
    const filteredWords = words.filter(
        (word) =>
            (word.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                word.nameUS?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                !searchQuery) &&
            (selectedLevel ? word.level.includes(selectedLevel) : true)
    );

    // Derived pagination values
    const totalPages = Math.ceil(filteredWords.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentWords = filteredWords.slice(startIndex, endIndex);

    useEffect(() => {
        const fetchWords = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    activeTab === "oxford3000"
                        ? `${import.meta.env.BASE_URL}json/oxford-3000.json`
                        : `${import.meta.env.BASE_URL}json/oxford-5000.json`
                );
                const data = await response.json();
                setWords(data);
            } catch (error) {
                console.error("Error fetching word data:", error);
            } finally {
                setLoading(false);
                setCurrentPage(1);
            }
        };

        fetchWords();
    }, [activeTab]);

    // Load review data from localStorage
    useEffect(() => {
        const storedData = JSON.parse(localStorage.getItem("ispeaker")) || {};
        setReviewData(storedData.wordReview || {});
    }, []);

    // Reset to first page when search query or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedLevel]);

    const handlePractice = (word) => {
        setSelectedWord(word);
        setViewState("details");
    };

    // Handle back navigation
    const handleBack = () => {
        setSelectedWord(null);
        setViewState("list");
    };

    const handleAccentChange = (newAccent) => {
        setAccent(newAccent); // Update the accent
    };

    const getBadgeClass = (review) => {
        switch (review) {
            case "good":
                return "badge badge-success";
            case "neutral":
                return "badge badge-warning";
            case "bad":
                return "badge badge-error";
            default:
                return "";
        }
    };

    return (
        <>
            <TopNavBar />
            <Container>
                <h1 className="py-6 text-3xl font-bold md:text-4xl">{t("navigation.words")}</h1>
                <AccentDropdown onAccentChange={handleAccentChange} />
                {viewState === "list" && (
                    <>
                        {/* Tabs for switching data */}
                        <div className="sticky top-[calc(5rem)] z-10 bg-base-100 py-8">
                            <div className="flex justify-center">
                                <ul className="menu menu-horizontal w-auto rounded-box bg-base-200 dark:bg-slate-600">
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("oxford3000")}
                                            className={`md:text-base ${
                                                activeTab === "oxford3000"
                                                    ? "active font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Oxford 3000
                                            <div
                                                className="tooltip tooltip-secondary font-normal"
                                                data-tip={t("wordPage.oxford3000Description")}
                                            >
                                                <IoInformationCircleOutline className="h-6 w-6" />
                                            </div>
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("oxford5000")}
                                            className={`md:text-base ${
                                                activeTab === "oxford5000"
                                                    ? "active font-semibold"
                                                    : ""
                                            }`}
                                        >
                                            Oxford 5000
                                            <div
                                                className="tooltip tooltip-left tooltip-secondary font-normal md:tooltip-top"
                                                data-tip={t("wordPage.oxford5000Description")}
                                            >
                                                <IoInformationCircleOutline className="h-6 w-6" />
                                            </div>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="mt-6 flex flex-col items-center justify-center space-y-4 md:flex-row md:space-x-4 md:space-y-0">
                                <input
                                    type="text"
                                    placeholder={t("wordPage.searchBox")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="input input-bordered w-full max-w-xs"
                                />
                                <select
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                    className="select select-bordered w-full max-w-xs"
                                >
                                    <option value="">{t("wordPage.allLevelSelectBox")}</option>
                                    <option value="a1">A1</option>
                                    <option value="a2">A2</option>
                                    <option value="b1">B1</option>
                                    <option value="b2">B2</option>
                                    <option value="c1">C1</option>
                                </select>
                            </div>
                        </div>

                        {filteredWords.length > 0 && (
                            <Pagination
                                t={t}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}

                        {/* Content Area */}
                        <div className="my-4 flex flex-wrap place-items-center justify-center gap-5">
                            {loading ? (
                                <div className="col-span-full text-center">
                                    <p className="text-lg font-semibold">
                                        {t("wordPage.loadingText")}
                                    </p>
                                </div>
                            ) : currentWords.length > 0 ? (
                                currentWords.map((word) => {
                                    const wordReview = reviewData[accent]?.[word.name] || null;
                                    return (
                                        <div key={word.wordId}>
                                            <div className="indicator my-4">
                                                {wordReview && (
                                                    <span
                                                        className={`${getBadgeClass(
                                                            wordReview
                                                        )} indicator-item indicator-center`}
                                                    >
                                                        {wordReview}
                                                    </span>
                                                )}
                                                <div className="card card-bordered flex h-full w-full justify-between pb-6 shadow-md dark:border-slate-600">
                                                    <div className="card-body flex-grow items-center text-center">
                                                        <h2 className="card-title" lang="en">
                                                            {word.name}
                                                        </h2>
                                                        <p className="italic" lang="en">
                                                            {word.pos.join(", ")}
                                                        </p>
                                                    </div>
                                                    <div className="card-actions px-6">
                                                        <button
                                                            className="btn btn-primary w-full"
                                                            onClick={() => handlePractice(word)}
                                                        >
                                                            {t("sound_page.practiceBtn")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full my-6 text-center">
                                    <p className="text-lg font-semibold">
                                        {t("wordPage.noResultText")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {filteredWords.length > 0 && (
                            <Pagination
                                t={t}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </>
                )}

                {viewState === "details" && selectedWord && (
                    <WordDetails
                        word={selectedWord}
                        handleBack={handleBack}
                        t={t}
                        accent={accent}
                        onAccentChange={handleAccentChange}
                    />
                )}
            </Container>
        </>
    );
};

export default PronunciationPractice;
