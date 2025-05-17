import PropTypes from "prop-types";

const PronunciationCheckerInfo = ({
    t,
    checking,
    error,
    pythonCheckResult,
    collapseOpen,
    setCollapseOpen,
}) => (
    <div className="my-8">
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
                        {t("settingPage.pronunciationSettings.checking", "Checking...")}
                    </div>
                )}
                {error && <div className="text-error mb-2">{error}</div>}
                {pythonCheckResult && (
                    <div>
                        <div>
                            <span className="font-bold">
                                {t("settingPage.pronunciationSettings.pythonCheckResult", "Result")}
                                :
                            </span>{" "}
                            {pythonCheckResult.found
                                ? t("settingPage.pronunciationSettings.pythonFound", "Python found")
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
                                    {t("settingPage.pronunciationSettings.stderr", "Stderr")}:
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
);

PronunciationCheckerInfo.propTypes = {
    t: PropTypes.func.isRequired,
    checking: PropTypes.bool.isRequired,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    pythonCheckResult: PropTypes.oneOfType([PropTypes.object, PropTypes.oneOf([null])]),
    collapseOpen: PropTypes.bool.isRequired,
    setCollapseOpen: PropTypes.func.isRequired,
};

export default PronunciationCheckerInfo;
