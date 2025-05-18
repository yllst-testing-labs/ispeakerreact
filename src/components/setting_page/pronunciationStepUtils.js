// Utility to calculate step statuses for pronunciation checker
export function getPronunciationStepStatuses(pythonCheckResult, checking, error) {
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
        step2Status = checking ? "pending" : "success";
    }

    // Step 3: Downloading phoneme model
    let step3Status = "pending";
    if (pythonCheckResult && pythonCheckResult.modelStatus) {
        if (pythonCheckResult.modelStatus === "found") {
            step3Status = "success";
        } else if (pythonCheckResult.modelStatus === "downloading") {
            step3Status = "pending";
        } else if (pythonCheckResult.modelStatus === "error") {
            step3Status = "error";
        }
    } else if (checking) {
        step3Status = "pending";
    }

    return { step1Status, step2Status, step3Status, deps };
} 