import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import { IoCheckmark, IoCloseOutline } from "react-icons/io5";
import { getPronunciationStepStatuses } from "./pronunciationStepUtils";

const PronunciationCheckerInfo = ({ t, checking, error, pythonCheckResult }) => {
    // Helper to get status icon
    const getStatusIcon = (status) => {
        if (status === "pending")
            return <span className="loading loading-spinner loading-sm"></span>;
        if (status === "success")
            return <IoCheckmark className="text-success h-5 w-5 items-center" />;
        if (status === "error")
            return <IoCloseOutline className="text-error h-5 w-5 items-center" />;
        return null;
    };

    const { step1Status, step2Status, step3Status, deps } = getPronunciationStepStatuses(pythonCheckResult, checking, error);

    const steps = [
        {
            key: "step1",
            label: t(
                "settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep1"
            ),
            status: step1Status,
        },
        {
            key: "step2",
            label: t(
                "settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep2"
            ),
            status: step2Status,
            deps,
        },
        {
            key: "step3",
            label: t(
                "settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep3"
            ),
            status: step3Status,
        },
    ];

    // Ref for the log container
    const logRef = useRef(null);
    // Get the log output
    const logOutput =
        pythonCheckResult && (pythonCheckResult.log || pythonCheckResult.stdout || "");
    // Auto-scroll to bottom when log changes
    useEffect(() => {
        if (logRef.current && logOutput) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logOutput]);

    return (
        <div className="mt-2">
            <ol className="mb-4 space-y-2">
                {steps.map((step) => (
                    <li key={step.key} className="flex items-start gap-x-2">
                        <div className="flex gap-x-2 pt-1">{getStatusIcon(step.status)}</div>
                        <div className="flex min-w-0 flex-auto flex-col gap-x-4">
                            <div className="min-w-0 flex-auto">{step.label}</div>
                            {/* For step 2, show each dependency */}
                            {step.key === "step2" && Array.isArray(step.deps) && (
                                <ul className="mt-1 ml-2 space-y-1">
                                    {step.deps.map((dep) => (
                                        <li
                                            key={dep.name}
                                            className="flex items-center gap-x-2 text-sm"
                                        >
                                            {getStatusIcon(dep.status)}
                                            <span>{dep.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
            <div className="bg-base-100 border-base-300 collapse border dark:border-slate-600">
                <input type="checkbox" />
                <div className="collapse-title font-semibold">
                    {t(
                        "settingPage.pronunciationSettings.showTechnicalInfo",
                        "Technical information"
                    )}
                </div>
                <div className="collapse-content text-sm">
                    {checking && (
                        <div className="mb-2">
                            <span className="loading loading-spinner loading-sm"></span>{" "}
                            {t("settingPage.pronunciationSettings.checking", "Checking...")}
                        </div>
                    )}
                    {error && <div className="text-error mb-2">{error}</div>}
                    {pythonCheckResult && (
                        <div>
                            {logOutput ? (
                                <div
                                    ref={logRef}
                                    className="bg-base-200 border-base-300 max-h-60 overflow-y-auto rounded border p-2 font-mono whitespace-pre-wrap"
                                >
                                    {logOutput}
                                </div>
                            ) : pythonCheckResult.stderr ? (
                                <div>
                                    <span className="font-bold">
                                        {t("settingPage.pronunciationSettings.stderr", "Stderr")}:
                                    </span>{" "}
                                    <pre className="inline whitespace-pre-wrap">
                                        {pythonCheckResult.stderr}
                                    </pre>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

PronunciationCheckerInfo.propTypes = {
    t: PropTypes.func.isRequired,
    checking: PropTypes.bool.isRequired,
    error: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
    pythonCheckResult: PropTypes.oneOfType([PropTypes.object, PropTypes.oneOf([null])]),
};

export default PronunciationCheckerInfo;
