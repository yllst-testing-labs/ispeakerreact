import PropTypes from "prop-types";
import { IoCheckmark, IoCloseOutline } from "react-icons/io5";

const PronunciationCheckerInfo = ({
    t,
    checking,
    error,
    pythonCheckResult,
    collapseOpen,
    setCollapseOpen,
}) => {
    // Helper to get status icon
    const getStatusIcon = (status) => {
        if (status === "pending")
            return <span className="loading loading-spinner loading-md"></span>;
        if (status === "success")
            return <IoCheckmark className="text-success h-6 w-6 items-center" />;
        if (status === "error")
            return <IoCloseOutline className="text-error h-6 w-6 items-center" />;
        return null;
    };

    // Step 1: Checking Python installation
    let step1Status = checking
        ? "pending"
        : error
        ? "error"
        : pythonCheckResult && pythonCheckResult.found
        ? "success"
        : pythonCheckResult && pythonCheckResult.found === false
        ? "error"
        : "pending";

    // Step 2: Installing dependencies
    let step2Status = "pending";
    let deps = pythonCheckResult && pythonCheckResult.deps;
    if (deps && Array.isArray(deps)) {
        if (deps.some((dep) => dep.status === "error")) step2Status = "error";
        else if (deps.every((dep) => dep.status === "success")) step2Status = "success";
        else if (deps.some((dep) => dep.status === "pending")) step2Status = "pending";
    } else if (step1Status === "success") {
        step2Status = checking ? "pending" : "success"; // fallback
    }

    // Step 3: Downloading phoneme model (not implemented yet)
    let step3Status = "pending";

    // Step 4: Testing installation
    let step4Status =
        pythonCheckResult && typeof pythonCheckResult.tested === "boolean"
            ? pythonCheckResult.tested
                ? "success"
                : "error"
            : "pending";

    const steps = [
        {
            key: "step1",
            label: t("settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep1"),
            status: step1Status,
        },
        {
            key: "step2",
            label: t("settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep2"),
            status: step2Status,
            deps,
        },
        {
            key: "step3",
            label: t("settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep3"),
            status: step3Status,
        },
        {
            key: "step4",
            label: t("settingPage.pronunciationSettings.pronunciationModalInstallationProcessStep4"),
            status: step4Status,
        },
    ];

    return (
        <div className="my-8">
            <ol className="mb-4 space-y-2">
                {steps.map((step) => (
                    <li key={step.key} className="flex items-start gap-x-2">
                        <div className="flex gap-x-2 pt-1">
                            {getStatusIcon(step.status)}
                        </div>
                        <div className="flex min-w-0 gap-x-4 flex-col flex-auto">
                            <div className="min-w-0 flex-auto">{step.label}</div>
                            {/* For step 2, show each dependency */}
                            {step.key === "step2" && Array.isArray(step.deps) && (
                                <ul className="ml-2 mt-1 space-y-1">
                                    {step.deps.map((dep) => (
                                        <li key={dep.name} className="flex items-center gap-x-2 text-sm">
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
            <div className="bg-base-100 border-base-300 collapse border">
                <input
                    type="checkbox"
                    className="peer"
                    checked={collapseOpen}
                    onChange={() => setCollapseOpen((v) => !v)}
                />
                <div className="collapse-title font-semibold">
                    {t(
                        "settingPage.pronunciationSettings.showTechnicalInfo",
                        "Show technical information"
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
                            {pythonCheckResult.log || pythonCheckResult.stdout ? (
                                <pre className="whitespace-pre-wrap">
                                    {pythonCheckResult.log || pythonCheckResult.stdout}
                                </pre>
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
    collapseOpen: PropTypes.bool.isRequired,
    setCollapseOpen: PropTypes.func.isRequired,
};

export default PronunciationCheckerInfo;
