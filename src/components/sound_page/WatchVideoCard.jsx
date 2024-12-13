import { IoInformationCircleOutline } from "react-icons/io5";
import { isElectron } from "../../utils/isElectron";

const WatchVideoCard = ({ t, videoUrl, iframeLoadingStates, handleIframeLoad }) => {
    return (
        <div className={`${iframeLoadingStates.modalIframe ? "overflow-hidden" : ""}`}>
            <div className="card card-bordered dark:border-slate-600 shadow-md w-full mb-6">
                <div className="card-body">
                    <div className="aspect-video">
                        <div className="w-full h-full">
                            {isElectron() && videoUrl?.isLocal && videoUrl.value.includes("http://localhost") ? (
                                <video controls className="w-full h-full">
                                    <source src={videoUrl.value} type="video/mp4" />
                                </video>
                            ) : (
                                <>
                                    {iframeLoadingStates.mainIframe && <div className="skeleton h-full w-full"></div>}
                                    <iframe
                                        src={videoUrl?.value}
                                        title="Phoneme Video"
                                        loading="lazy"
                                        allowFullScreen
                                        onLoad={() => {
                                            handleIframeLoad("mainIframe");
                                        }}
                                        style={
                                            iframeLoadingStates.mainIframe
                                                ? { visibility: "hidden" }
                                                : { visibility: "visible" }
                                        }
                                        className="w-full h-full"></iframe>
                                </>
                            )}
                        </div>
                    </div>
                    {isElectron() && !videoUrl?.value.includes("http://localhost") ? (
                        <div role="alert" className="alert mt-5">
                            <IoInformationCircleOutline className="h-6 w-6" />
                            <span>{t("alert.alertOnlineVideo")}</span>
                        </div>
                    ) : (
                        ""
                    )}
                </div>
            </div>
        </div>
    );
};

export default WatchVideoCard