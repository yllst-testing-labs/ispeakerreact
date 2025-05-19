import PropTypes from "prop-types";
import { Trans } from "react-i18next";
import { IoInformationCircleOutline } from "react-icons/io5";
import openExternal from "../../utils/openExternal";
import modelOptions from "./modelOptions";

const PronunciationCheckerDialogContent = ({
    t,
    checking,
    closeConfirmDialog,
    handleProceed,
    hasPreviousInstall,
    modelValue,
    onModelChange,
}) => {
    return (
        <div className="modal-box">
            <h3 className="text-lg font-bold">
                {t("settingPage.pronunciationSettings.pronunciationModalHeading")}
            </h3>
            <div className="py-4">
                {/* Model selection dropdown */}
                <div className="mb-4">
                    <label className="mb-1 block font-semibold">
                        {t(
                            "settingPage.pronunciationSettings.modelSelectLabel",
                            "Select model to download"
                        )}
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={modelValue}
                        onChange={(e) => onModelChange(e.target.value)}
                        disabled={checking}
                    >
                        {modelOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.size})
                            </option>
                        ))}
                    </select>
                    {/* Show description for selected model */}
                    <div className="mt-2 min-h-[1.5em] text-sm text-gray-600">
                        {modelOptions.find((opt) => opt.value === modelValue) &&
                            t(modelOptions.find((opt) => opt.value === modelValue).description)}
                    </div>
                </div>
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
    modelValue: PropTypes.string.isRequired,
    onModelChange: PropTypes.func.isRequired,
};

export default PronunciationCheckerDialogContent;
