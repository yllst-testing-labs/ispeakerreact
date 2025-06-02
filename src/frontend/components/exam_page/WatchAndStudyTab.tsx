import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCloseOutline, IoInformationCircleOutline } from "react-icons/io5";
import isElectron from "../../utils/isElectron.js";
import useAutoDetectTheme from "../../utils/ThemeContext/useAutoDetectTheme.js";
import { WatchAndStudyTabProps } from "./types.js";

const WatchAndStudyTab = ({
    videoUrl,
    subtitleUrl,
    taskData,
    dialog,
    skills,
}: WatchAndStudyTabProps) => {
    const { t } = useTranslation();

    const [modalImage, setModalImage] = useState<string>("");
    const [imageLoading, setImageLoading] = useState<boolean>(false);
    const imageModalRef = useRef<HTMLDialogElement | null>(null);
    const [iframeLoading, setiFrameLoading] = useState<boolean>(true);

    const { autoDetectedTheme } = useAutoDetectTheme();

    const handleImageClick = (imageName: string) => {
        const newImage = `${import.meta.env.BASE_URL}images/ispeaker/exam_images/fullsize/${imageName}.webp`;

        // Only set loading if the image is different
        if (modalImage !== newImage) {
            setImageLoading(true);
            setModalImage(newImage);
        }

        imageModalRef.current?.showModal();
    };

    const handleIframeLoad = () => setiFrameLoading(false);

    // State for highlighting the dialog
    const [highlightState, setHighlightState] = useState<Record<number, boolean>>({
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
    });

    const handleCheckboxChange = (index: number) => {
        setHighlightState((prevState) => ({
            ...prevState,
            [index]: !prevState[index],
        }));
    };

    const getHighlightClass = (index: number) => {
        switch (index) {
            case 1:
                return "font-semibold bg-primary text-primary-content";
            case 2:
                return "font-semibold bg-secondary text-secondary-content";
            case 3:
                return "font-semibold bg-accent text-accent-content";
            case 4:
                return "font-semibold bg-info text-info-content";
            case 5:
                return "font-semibold bg-error text-error-content";
            case 6:
                return "font-semibold bg-fuchsia-600 text-white";
            default:
                return "";
        }
    };

    const getCheckboxHighlightClass = (index: number) => {
        switch (index) {
            case 1:
                return "checkbox-primary";
            case 2:
                return "checkbox-secondary";
            case 3:
                return "checkbox-accent";
            case 4:
                return "checkbox-info";
            case 5:
                return "checkbox-error";
            case 6:
                return "border-fuchsia-600 bg-fuchsia-600 checked:text-white checked:bg-fuchsia-600";
            default:
                return "";
        }
    };

    const highlightDialog = (speech: string) => {
        return speech.replace(/highlight-dialog-(\d+)/g, (match: string, p1: string) => {
            const idx = parseInt(p1, 10);
            const className = getHighlightClass(idx);
            return highlightState[idx] ? `${className} ${match}` : `${match}`;
        });
    };

    const examTaskQuestion = t(taskData.para, { returnObjects: true }) as string[];
    const examTaskList =
        taskData.listItems && (t(taskData.listItems, { returnObjects: true }) as string[]);

    return (
        <>
            <div>
                <div className="text-xl font-semibold">{t("tabConversationExam.taskCard")}</div>
                <div className="divider divider-secondary mt-0 mb-4"></div>

                <div className="flex flex-row flex-wrap justify-center gap-4">
                    {taskData.images.map((image, index) => (
                        <div className="flex w-full md:w-[30%]" key={index}>
                            <div className="aspect-w-16 aspect-h-9">
                                <img
                                    alt={`Thumbnail ${index + 1}`}
                                    role="button"
                                    src={`${
                                        import.meta.env.BASE_URL
                                    }images/ispeaker/exam_images/thumb/${image}.webp`}
                                    className="h-full w-full cursor-pointer object-cover"
                                    onClick={() => handleImageClick(image)}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-3">
                    {examTaskQuestion.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                    {examTaskList && (
                        <ul className="ms-2 list-inside list-disc">
                            {examTaskList.map((item, index) => (
                                <li className="my-1" key={index}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="divider"></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <div className="text-xl font-semibold">
                        {t("tabConversationExam.watchCard")}
                    </div>
                    <div className="divider divider-secondary mt-0 mb-4"></div>

                    <div className="bg-base-100 top-[calc(14rem)] md:sticky md:z-10">
                        <div className="aspect-video">
                            <div className="relative h-full w-full">
                                {isElectron() &&
                                videoUrl &&
                                videoUrl.startsWith("http://localhost") ? (
                                    <MediaPlayer src={videoUrl}>
                                        <MediaProvider />
                                        <DefaultVideoLayout
                                            icons={defaultLayoutIcons}
                                            colorScheme={
                                                autoDetectedTheme as
                                                    | "default"
                                                    | "light"
                                                    | "dark"
                                                    | "system"
                                            }
                                        />
                                        <Track
                                            src={subtitleUrl}
                                            kind="subtitles"
                                            label="English"
                                            lang="en"
                                            type="srt"
                                            default
                                        />
                                    </MediaPlayer>
                                ) : (
                                    <>
                                        {iframeLoading && (
                                            <div className="skeleton absolute inset-0 h-full w-full"></div>
                                        )}
                                        <iframe
                                            src={videoUrl}
                                            title="Exam video"
                                            loading="lazy"
                                            allowFullScreen
                                            onLoad={handleIframeLoad}
                                            style={
                                                iframeLoading
                                                    ? { visibility: "hidden" }
                                                    : { visibility: "visible" }
                                            }
                                            className={`h-full w-full transition-opacity duration-300 ${
                                                iframeLoading ? "opacity-0" : "opacity-100"
                                            }`}
                                        ></iframe>
                                    </>
                                )}
                            </div>
                        </div>
                        {isElectron() && !videoUrl.startsWith("http://localhost") ? (
                            <div role="alert" className="alert mt-5">
                                <IoInformationCircleOutline className="h-6 w-6" />
                                <span>{t("alert.alertOnlineVideo")}</span>
                            </div>
                        ) : (
                            ""
                        )}
                    </div>
                </div>

                <div>
                    <div className="text-xl font-semibold">
                        {t("tabConversationExam.studyCard")}
                    </div>
                    <div className="divider divider-secondary mt-0 mb-4"></div>
                    <div className="collapse-arrow bg-base-200 collapse dark:bg-slate-700">
                        <input
                            type="checkbox"
                            title={t("tabConversationExam.studyExpandBtn")}
                            aria-label={t("tabConversationExam.studyExpandBtn")}
                        />
                        <button type="button" className="collapse-title text-start font-semibold">
                            {t("tabConversationExam.studyExpandBtn")}
                        </button>
                        <div className="collapse-content">
                            <div className="dialog-section">
                                {dialog.map((line, index) => (
                                    <div lang="en" key={index} className="mb-2">
                                        <span className="font-bold">{line.speaker}:</span>{" "}
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: highlightDialog(line.speech),
                                            }}
                                        ></span>
                                    </div>
                                ))}
                            </div>
                            <div className="divider"></div>
                            <div className="px-3">
                                {skills.map((skill, index) => (
                                    <div key={index} className="mb-2">
                                        <label
                                            htmlFor={`skilllabel-${index}`}
                                            className="cursor-pointer"
                                        >
                                            <span
                                                className={`${
                                                    highlightState[index + 1]
                                                        ? getHighlightClass(index + 1)
                                                        : ""
                                                }`}
                                            >
                                                {t(skill.label)}
                                            </span>
                                            <input
                                                id={`skilllabel-${index}`}
                                                type="checkbox"
                                                className={`checkbox checkbox-sm ms-2 align-text-bottom ${
                                                    highlightState[index + 1]
                                                        ? getCheckboxHighlightClass(index + 1)
                                                        : ""
                                                }`}
                                                checked={!!highlightState[index + 1]}
                                                onChange={() => handleCheckboxChange(index + 1)}
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <dialog ref={imageModalRef} className="modal">
                <div className="modal-box w-11/12 max-w-5xl">
                    <form method="dialog">
                        <button className="btn btn-circle btn-ghost btn-sm absolute top-2 right-2">
                            <IoCloseOutline className="h-6 w-6" />
                        </button>
                    </form>
                    <h3 className="text-lg font-bold">
                        {t("tabConversationExam.imageFullSizeModal")}
                    </h3>
                    <div className="relative flex w-full items-center justify-center py-4">
                        {imageLoading && ( // Show skeleton loader if image is loading
                            <div
                                className={`skeleton absolute h-full max-h-[600px] w-full max-w-6xl ${imageLoading ? "z-30" : "z-0"}`}
                            ></div>
                        )}
                        {modalImage && (
                            <img
                                src={modalImage}
                                className={`max-h-[600px] object-contain transition-opacity duration-300 ${
                                    imageLoading ? "z-0 opacity-0" : "z-30 opacity-100"
                                }`}
                                loading="lazy"
                                onLoad={() => setImageLoading(false)} // Stop loading when image is loaded
                                onError={() => setImageLoading(false)} // Handle errors
                                alt="Full size"
                            />
                        )}
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default WatchAndStudyTab;
