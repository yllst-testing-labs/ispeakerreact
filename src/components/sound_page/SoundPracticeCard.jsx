import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { IoInformationCircleOutline } from "react-icons/io5";
import { MdOutlineOndemandVideo } from "react-icons/md";
import { isElectron } from "../../utils/isElectron";

const SoundPracticeCard = ({ textContent, videoUrl, offlineVideo, accent, t, phoneme }) => {
    const [localVideoUrl, setLocalVideoUrl] = useState(null);
    const [useOnlineVideo, setUseOnlineVideo] = useState(false);
    const [iframeLoadingStates, setIframeLoadingStates] = useState({
        modalIframe: true,
    });
    const [showIframe, setShowIframe] = useState(false);
    const soundVideoModal = useRef(null);

    const imgPhonemeThumbSrc =
        accent === "american"
            ? `${import.meta.env.BASE_URL}images/ispeaker/sound_images/sounds_american.webp`
            : `${import.meta.env.BASE_URL}images/ispeaker/sound_images/sounds_british.webp`;

    const handleIframeLoad = (iframeKey) => {
        setIframeLoadingStates((prevStates) => ({
            ...prevStates,
            [iframeKey]: false,
        }));
    };

    const handleShow = () => {
        setShowIframe(true);
        setIframeLoadingStates((prevStates) => ({
            ...prevStates,
            modalIframe: true,
        }));
        soundVideoModal.current?.showModal();
    };

    const handleClose = () => {
        setShowIframe(false);
        soundVideoModal.current?.close();
    };

    useEffect(() => {
        const checkLocalVideo = async () => {
            if (isElectron() && offlineVideo) {
                try {
                    const currentPort = await window.electron.ipcRenderer.invoke("get-port");
                    const folderName = `iSpeakerReact_SoundVideos_${accent === "british" ? "GB" : "US"}`;
                    const localUrl = `http://localhost:${currentPort}/video/${folderName}/${offlineVideo}`;

                    // Check if the video exists
                    const response = await fetch(localUrl, { method: "HEAD" });
                    if (response.ok) {
                        setLocalVideoUrl(localUrl);
                        setUseOnlineVideo(false);
                    } else {
                        setUseOnlineVideo(true);
                    }
                } catch (error) {
                    console.error("Error checking local video:", error);
                    setUseOnlineVideo(true);
                }
            } else {
                setUseOnlineVideo(true);
            }
        };

        checkLocalVideo();
    }, [offlineVideo, accent]);

    const videoUrlToUse = isElectron() && !useOnlineVideo ? localVideoUrl : videoUrl;

    return (
        <div className="card bg-base-200">
            <div className="card-body">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="avatar">
                            <div className="w-12 rounded-full">
                                <img src={imgPhonemeThumbSrc} alt="Phoneme thumbnail" />
                            </div>
                        </div>
                        <div>
                            <p
                                className="text-base"
                                dangerouslySetInnerHTML={{ __html: textContent }}
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleShow}>
                        <MdOutlineOndemandVideo className="h-6 w-6" />
                    </button>
                </div>
            </div>

            <dialog className="modal" ref={soundVideoModal}>
                <div className="modal-box w-11/12 max-w-5xl">
                    <h3 className="pb-4 text-lg">
                        <span
                            dangerouslySetInnerHTML={{ __html: `${textContent.split(" - ")[0]}` }}
                        />
                    </h3>
                    <div className={`${iframeLoadingStates.modalIframe ? "overflow-hidden" : ""}`}>
                        <div className="aspect-video">
                            <div className="relative h-full w-full">
                                {localVideoUrl && !useOnlineVideo ? (
                                    <MediaPlayer src={localVideoUrl} className="h-full w-full">
                                        <MediaProvider />
                                        <DefaultVideoLayout
                                            icons={defaultLayoutIcons}
                                            colorScheme="light"
                                        />
                                    </MediaPlayer>
                                ) : (
                                    showIframe &&
                                    videoUrlToUse && (
                                        <>
                                            {iframeLoadingStates.modalIframe && (
                                                <div className="skeleton absolute inset-0 h-full w-full"></div>
                                            )}
                                            <iframe
                                                src={videoUrlToUse}
                                                title={`${phoneme} - ${textContent.split(" - ")[0]}`}
                                                allowFullScreen
                                                onLoad={() => handleIframeLoad("modalIframe")}
                                                className={`h-full w-full transition-opacity duration-300 ${
                                                    iframeLoadingStates.modalIframe
                                                        ? "opacity-0"
                                                        : "opacity-100"
                                                }`}
                                            />
                                        </>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    {isElectron() && useOnlineVideo && (
                        <div role="alert" className="alert mt-5">
                            <IoInformationCircleOutline className="h-6 w-6" />
                            <span>{t("alert.alertOnlineVideo")}</span>
                        </div>
                    )}
                    <div className="modal-action">
                        <form method="dialog">
                            <button type="button" className="btn" onClick={handleClose}>
                                {t("sound_page.closeBtn")}
                            </button>
                        </form>
                    </div>
                </div>
            </dialog>
        </div>
    );
};

SoundPracticeCard.propTypes = {
    textContent: PropTypes.string.isRequired,
    videoUrl: PropTypes.string.isRequired,
    offlineVideo: PropTypes.string.isRequired,
    accent: PropTypes.oneOf(["british", "american"]).isRequired,
    t: PropTypes.func.isRequired,
    phoneme: PropTypes.string.isRequired,
};

export default SoundPracticeCard;
