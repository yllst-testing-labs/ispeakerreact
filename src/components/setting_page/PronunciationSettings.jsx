import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoWarningOutline } from "react-icons/io5";
import PronunciationCheckerDialogContent from "./PronunciationCheckerDialogContent";
import PronunciationCheckerInfo from "./PronunciationCheckerInfo";
import { checkPythonInstalled } from "./PronunciationUtils";

const PronunciationSettings = () => {
    const { t } = useTranslation();
    const confirmDialogRef = useRef(null);
    const checkerDialogRef = useRef(null);
    const [pythonCheckResult, setPythonCheckResult] = useState(null);
    const [collapseOpen, setCollapseOpen] = useState(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);

    const openConfirmDialog = () => {
        confirmDialogRef.current?.showModal();
    };

    const closeConfirmDialog = () => {
        confirmDialogRef.current?.close();
    };

    const openCheckerDialog = () => {
        checkerDialogRef.current?.showModal();
    };

    const closeCheckerDialog = () => {
        checkerDialogRef.current?.close();
    };

    // Decoupled logic for checking Python installation
    const checkPython = async () => {
        setChecking(true);
        setError(null);
        setCollapseOpen(true);
        setPythonCheckResult(null);
        try {
            const result = await checkPythonInstalled();
            setPythonCheckResult(result);
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setChecking(false);
        }
    };

    const handleProceed = () => {
        closeConfirmDialog();
        openCheckerDialog();
        checkPython();
    };

    return (
        <>
            <div className="mt-4">
                <div className="flex gap-x-8 gap-y-6">
                    <div className="flex basis-1/2 items-center space-y-1">
                        <p className="font-semibold">
                            {t("settingPage.pronunciationSettings.pronunciationHeading")}
                        </p>
                    </div>
                    <div className="flex basis-1/2 justify-end">
                        <button className="btn" onClick={openConfirmDialog}>
                            {t("settingPage.pronunciationSettings.pronunciationBtn")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation dialog */}
            <dialog ref={confirmDialogRef} className="modal">
                <PronunciationCheckerDialogContent
                    t={t}
                    checking={checking}
                    closeConfirmDialog={closeConfirmDialog}
                    handleProceed={handleProceed}
                />
            </dialog>

            {/* Checker dialog */}
            <dialog ref={checkerDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t(
                            "settingPage.pronunciationSettings.pronunciationModalInstallationProcess"
                        )}
                    </h3>
                    <div className="py-4">
                        <div role="alert" className="alert alert-warning text-base">
                            <IoWarningOutline className="h-6 w-6" />
                            <span>
                                {t(
                                    "settingPage.pronunciationSettings.pronunciationModalInstallationProcessWarning"
                                )}
                            </span>
                        </div>
                    </div>
                    <PronunciationCheckerInfo
                        t={t}
                        checking={checking}
                        error={error}
                        pythonCheckResult={pythonCheckResult}
                        collapseOpen={collapseOpen}
                        setCollapseOpen={setCollapseOpen}
                    />
                    <div className="modal-action">
                        <button
                            type="button"
                            className="btn"
                            onClick={closeCheckerDialog}
                            disabled={checking}
                        >
                            {t("sound_page.closeBtn")}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default PronunciationSettings;
