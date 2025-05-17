import { useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import openExternal from "../../utils/openExternal";
import { IoInformationCircleOutline } from "react-icons/io5";

const PronunciationSettings = () => {
    const { t } = useTranslation();
    const confirmDialogRef = useRef(null);

    const openConfirmDialog = () => {
        confirmDialogRef.current?.showModal();
    };

    const closeConfirmDialog = () => {
        confirmDialogRef.current?.close();
    };

    const handleInstallPronunciation = () => {
        console.log("stubbing pronunciation checker...");
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
                    <div className="modal-action">
                        <button type="button" className="btn" onClick={closeConfirmDialog}>
                            {t("settingPage.exerciseSettings.cancelBtn", "Cancel")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleInstallPronunciation}
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
