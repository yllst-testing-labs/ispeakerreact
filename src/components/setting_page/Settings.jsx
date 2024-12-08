import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Container from "../../ui/Container";
import { isElectron } from "../../utils/isElectron";
import TopNavBar from "../general/TopNavBar";
import AppearanceSettings from "./Appearance";
import AppInfo from "./AppInfo";
import CachingSettings from "./Caching";
import ExerciseTimer from "./ExerciseTimer";
import LogSettings from "./LogSettings";
import ResetSettings from "./ResetSettings";
import VideoDownloadMenu from "./VideoDownloadMenu";
import VideoDownloadSubPage from "./VideoDownloadSubPage";

const SettingsPage = () => {
    const { t } = useTranslation();

    useEffect(() => {
        document.title = `${t("navigation.settings")} | iSpeakerReact v${__APP_VERSION__}`;
    }, [t]);

    const [resetFlag, setResetFlag] = useState(false); // Boolean flag to force remount
    const [currentPage, setCurrentPage] = useState("settings");

    const handleReset = () => {
        // Change the key to remount the CachingSettings component
        setResetFlag((prevFlag) => !prevFlag);
    };

    const handleVideoDownloadMenuPage = () => {
        setCurrentPage("video-download");
    };

    const handleGoBackToSettings = () => {
        setCurrentPage("settings");
    };

    return (
        <>
            <TopNavBar />
            <Container>
                <div className="flex justify-center">
                    <div className="flex-2">
                        {currentPage === "settings" && (
                            <>
                                <h1 className="fw-semibold">{t("settingPage.heading")}</h1>
                                <div className="mt-4">
                                    {isElectron() && (
                                        <>
                                            <hr className="my-4" />
                                            <AppInfo />
                                        </>
                                    )}
                                    <ExerciseTimer key={`exercise-timer-${resetFlag}`} />
                                    <hr className="my-4" />
                                    <AppearanceSettings key={`appearance-${resetFlag}`} />
                                    {isElectron() && (
                                        <>
                                            <hr className="my-4" />
                                            <VideoDownloadMenu onClick={handleVideoDownloadMenuPage} />
                                        </>
                                    )}
                                    {!isElectron() && (
                                        <>
                                            <hr className="my-4" />
                                            <CachingSettings key={resetFlag} />
                                        </>
                                    )}
                                    {isElectron() && (
                                        <>
                                            <hr className="my-4" />
                                            <LogSettings />
                                        </>
                                    )}
                                    <hr className="my-4" />
                                    <ResetSettings onReset={handleReset} />
                                </div>
                            </>
                        )}

                        {currentPage === "video-download" && <VideoDownloadSubPage onGoBack={handleGoBackToSettings} />}
                    </div>
                </div>
            </Container>
        </>
    );
};

export default SettingsPage;
