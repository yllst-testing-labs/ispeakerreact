import { Trans } from "react-i18next";
import { IoInformationCircleOutline } from "react-icons/io5";
import openExternal from "../../utils/openExternal";

const PronunciationCheckerDialogContent = ({
    t,
    checking,
    closeConfirmDialog,
    handleProceed,
}) => {
    return (
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
            <p className="mb-4">{t("settingPage.pronunciationSettings.pronunciationModalBody")}</p>
            <div className="modal-action">
                <button
                    type="button"
                    className="btn"
                    onClick={closeConfirmDialog}
                    disabled={checking}
                >
                    {t("settingPage.exerciseSettings.cancelBtn", "Cancel")}
                </button>
                {!checking && (
                    <button type="button" className="btn btn-primary" onClick={handleProceed}>
                        {t("settingPage.pronunciationSettings.pronunciationModalBtn", "Proceed")}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PronunciationCheckerDialogContent;
