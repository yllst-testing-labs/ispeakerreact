import { useRef, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import openExternal from "../../utils/openExternal";
import { IoInformationCircleOutline } from "react-icons/io5";
import { checkPythonInstalled } from "./PronunciationUtils";

const PronunciationSettings = () => {
    const { t } = useTranslation();
    const confirmDialogRef = useRef(null);
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

    const handleInstallPronunciation = () => {
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

            <dialog ref={confirmDialogRef} className="modal">
                <div className="modal-box">
                    <h3 className="text-lg font-bold">
                        {t("settingPage.pronunciationSettings.pronunciationModalHeading")}
                    </h3>
                    <div className="py-4">
                        <div role="alert" className="alert alert-info text-base">
                            <IoInformationCircleOutline className="h-6 w-6" />
                            <span>
                                <Trans
                                    i18nKey="settingPage.pronunciationSettings.pronunciationModalBodyPython"
                                    components={[
                                        <button
                                            key="python-link"
                                            type="button"
                                            className="link font-semibold underline"
                                            onClick={() =>
                                                openExternal("https://www.python.org/downloads/")
                                            }
                                        />,
                                    ]}
                                />
                            </span>
                        </div>
                    </div>
                    <p className="mb-4">
                        {t("settingPage.pronunciationSettings.pronunciationModalBody")}
                    </p>
                    {/* Collapse for Python check output */}
                    <div className="my-4">
                        <div className="bg-base-100 border-base-300 collapse border">
                            <input
                                type="checkbox"
                                className="peer"
                                checked={collapseOpen}
                                onChange={() => setCollapseOpen((v) => !v)}
                            />
                            <div className="collapse-title font-semibold">
                                {t(
                                    "settingPage.pronunciationSettings.pythonCheckCollapseTitle",
                                    "Python Installation Check Output"
                                )}
                            </div>
                            <div className="collapse-content text-sm">
                                {checking && (
                                    <div className="mb-2">
                                        <span className="loading loading-spinner loading-md"></span>{" "}
                                        {t(
                                            "settingPage.pronunciationSettings.checking",
                                            "Checking..."
                                        )}
                                    </div>
                                )}
                                {error && <div className="text-error mb-2">{error}</div>}
                                {pythonCheckResult && (
                                    <div>
                                        <div>
                                            <span className="font-bold">
                                                {t(
                                                    "settingPage.pronunciationSettings.pythonCheckResult",
                                                    "Result"
                                                )}
                                                :
                                            </span>{" "}
                                            {pythonCheckResult.found
                                                ? t(
                                                      "settingPage.pronunciationSettings.pythonFound",
                                                      "Python found"
                                                  )
                                                : t(
                                                      "settingPage.pronunciationSettings.pythonNotFound",
                                                      "Python not found"
                                                  )}
                                        </div>
                                        {pythonCheckResult.version && (
                                            <div>
                                                <span className="font-bold">
                                                    {t(
                                                        "settingPage.pronunciationSettings.pythonVersion",
                                                        "Version"
                                                    )}
                                                    :
                                                </span>{" "}
                                                {pythonCheckResult.version}
                                            </div>
                                        )}
                                        {pythonCheckResult.stderr && (
                                            <div>
                                                <span className="font-bold">
                                                    {t(
                                                        "settingPage.pronunciationSettings.stderr",
                                                        "Stderr"
                                                    )}
                                                    :
                                                </span>{" "}
                                                <pre className="inline whitespace-pre-wrap">
                                                    {pythonCheckResult.stderr}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-action">
                        <button type="button" className="btn" onClick={closeConfirmDialog}>
                            {t("settingPage.exerciseSettings.cancelBtn", "Cancel")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleInstallPronunciation}
                            disabled={checking}
                        >
                            {t(
                                "settingPage.pronunciationSettings.pronunciationModalBtn",
                                "Proceed"
                            )}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default PronunciationSettings;
