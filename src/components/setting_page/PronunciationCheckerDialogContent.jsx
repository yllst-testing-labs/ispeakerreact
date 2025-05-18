import PropTypes from "prop-types";
import { Trans } from "react-i18next";
import { IoInformationCircleOutline } from "react-icons/io5";
import openExternal from "../../utils/openExternal";

const PronunciationCheckerDialogContent = ({
    t,
    checking,
    closeConfirmDialog,
    handleProceed,
    hasPreviousInstall,
}) => {
    return (
        <div className="modal-box">
            <h3 className="text-lg font-bold">
                {t("settingPage.pronunciationSettings.pronunciationModalHeading")}
            </h3>
            <div className="py-4">
                {hasPreviousInstall ? (
                    <div className="alert alert-info mb-4 text-base">
                        <IoInformationCircleOutline className="h-6 w-6" />
                        <span>{t("settingPage.pronunciationSettings.previousInstallMsg")}</span>
                    </div>
                ) : (
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
                )}
                <p>{t("settingPage.pronunciationSettings.pronunciationModalBody")}</p>
            </div>

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

PronunciationCheckerDialogContent.propTypes = {
    t: PropTypes.func.isRequired,
    checking: PropTypes.bool.isRequired,
    closeConfirmDialog: PropTypes.func.isRequired,
    handleProceed: PropTypes.func.isRequired,
    hasPreviousInstall: PropTypes.bool.isRequired,
};

export default PronunciationCheckerDialogContent;
