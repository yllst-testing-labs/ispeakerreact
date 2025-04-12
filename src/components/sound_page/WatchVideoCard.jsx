import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { isElectron } from "../../utils/isElectron";

const WatchVideoCard = ({ videoData, accent, t }) => {
    const [iframeLoading, setIframeLoading] = useState(true);
    const [localVideoUrl, setLocalVideoUrl] = useState(null);

    useEffect(() => {
        const checkLocalVideo = async () => {
            if (isElectron() && videoData?.mainOfflineVideo) {
                try {
                    const port = await window.electron?.ipcRenderer?.invoke("get-port");
                    const folderName = `iSpeakerReact_SoundVideos_${accent === "british" ? "GB" : "US"}`;
                    const localUrl = `http://localhost:${port}/video/${folderName}/${videoData.mainOfflineVideo}`;

                    // Check if the local video exists
                    const response = await fetch(localUrl, { method: "HEAD" });
                    if (response.ok) {
                        setLocalVideoUrl(localUrl);
                    }
                } catch (error) {
                    console.warn("Error checking local video:", error);
                }
            }
        };

        checkLocalVideo();
    }, [videoData, accent]);

    const handleIframeLoad = () => {
        setIframeLoading(false);
    };

    const videoUrl = isElectron() ? localVideoUrl : videoData?.mainOnlineVideo;

    return (
        <div className="card card-lg card-border mb-6 w-full shadow-md dark:border-slate-600">
            <div className="card-body">
                <div className={`${iframeLoading ? "overflow-hidden" : ""}`}>
                    <div className="aspect-video">
                        <div className="relative h-full w-full">
                            {localVideoUrl ? (
                                <MediaPlayer src={localVideoUrl} className="h-full w-full">
                                    <MediaProvider />
                                    <DefaultVideoLayout
                                        icons={defaultLayoutIcons}
                                        colorScheme="light"
                                    />
                                </MediaPlayer>
                            ) : (
                                <>
                                    {iframeLoading && (
                                        <div className="skeleton absolute inset-0 h-full w-full"></div>
                                    )}
                                    <iframe
                                        src={videoUrl}
                                        title="Phoneme Video"
                                        allowFullScreen
                                        onLoad={handleIframeLoad}
                                        className={`h-full w-full transition-opacity duration-300 ${
                                            iframeLoading ? "opacity-0" : "opacity-100"
                                        }`}
                                    ></iframe>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

WatchVideoCard.propTypes = {
    videoData: PropTypes.shape({
        mainOfflineVideo: PropTypes.string,
        mainOnlineVideo: PropTypes.string,
    }),
    accent: PropTypes.oneOf(["british", "american"]).isRequired,
    t: PropTypes.func.isRequired,
};

export default WatchVideoCard;
