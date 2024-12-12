import { useState } from "react";
import { isElectron } from "../../utils/isElectron";
import { useTranslation } from "react-i18next";

const SoundVideoModal = ({ videoUrls, videoUrl, videoLoading }) => {
    const { t } = useTranslation();

    const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
    const [selectedVideoModalIndex, setSelectedVideoModalIndex] = useState("");
    const [iframeLoadingStates, setIframeLoadingStates] = useState({
        mainIframe: true,
        modalIframe: true,
    });

    const handleClose = () => {
        document.getElementById("sound_video_modal").close();
    };

    const handleIframeLoad = (iframeKey) => {
        setIframeLoadingStates((prevStates) => ({
            ...prevStates,
            [iframeKey]: false,
        }));
    };

    return (
        <dialog id="sound_video_modal" className="modal">
            <div className={`modal-box w-full max-w-4xl ${iframeLoadingStates.modalIframe ? "overflow-hidden" : ""}`}>
                <h3 className="font-bold text-lg">
                    {t("sound_page.clipModalTitle")} #{selectedVideoModalIndex}
                </h3>
                <div className="py-4">
                    <div className="aspect-video">
                        <div className="w-full h-full">
                            {isElectron() && selectedVideoUrl.includes("localhost:8998") ? (
                                <video controls className="w-full h-full">
                                    <source src={selectedVideoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <>
                                    {iframeLoadingStates.modalIframe && <div className="skeleton h-full w-full"></div>}
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
                            )}
                        </div>
                    </div>
                </div>
                {isElectron() && !selectedVideoUrl.startsWith("http://localhost") && (
                    <div className="alert alert-secondary mt-4">{t("alert.alertOnlineVideo")}</div>
                )}
                <div className="modal-action">
                    <form method="dialog">
                        <button type="button" className="btn">{t("sound_page.closeBtn")}</button>
                    </form>
                </div>
            </div>
        </dialog>
    );
};

export default SoundVideoModal;
