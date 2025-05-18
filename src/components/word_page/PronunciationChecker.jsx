import PropTypes from "prop-types";
import { useRef, useState } from "react";
import { isElectron } from "../../utils/isElectron";

const PronunciationChecker = ({ icon, disabled }) => {
    const [result, setResult] = useState(null);
    const dialogRef = useRef();

    const checkPronunciation = async () => {
        if (!isElectron()) {
            // Show toast or dialog for web
            alert("Feature not available in web");
            return;
        }
        // IPC call to get status
        const status = await window.electron.ipcRenderer.invoke("get-pronunciation-install-status");
        if (!status?.model || status.model.status !== "success") {
            // Open dialog
            if (dialogRef.current) {
                dialogRef.current.showModal();
            }
        } else {
            // Run checker logic here, for now just simulate result
            setResult("Your pronunciation is great!");
        }
    };

    return (
        <>
            <div className="my-4 flex w-full flex-col items-center gap-2">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={checkPronunciation}
                    disabled={disabled}
                >
                    {icon} Check pronunciation
                </button>
            </div>

            {result && (
                <div className="flex justify-center gap-2 pt-4">
                    <div className="card card-border card-lg w-full shadow-sm md:w-2xl dark:border-slate-600">
                        <div className="card-body">
                            <h2 className="card-title">Pronunciation result</h2>
                            <div className="divider divider-secondary mt-0 mb-4"></div>
                            <p>{result}</p>
                        </div>
                    </div>
                </div>
            )}

            <dialog ref={dialogRef} className="modal">
                <form method="dialog" className="modal-box">
                    <h3 className="text-lg font-bold">Pronunciation Checker Not Installed</h3>
                    <p className="py-4">
                        Please go to settings and install the Pronunciation Checker files.
                    </p>
                    <button className="btn btn-primary" onClick={() => dialogRef.current.close()}>
                        OK
                    </button>
                </form>
            </dialog>
        </>
    );
};

PronunciationChecker.propTypes = {
    icon: PropTypes.node,
    disabled: PropTypes.bool,
};

export default PronunciationChecker;
