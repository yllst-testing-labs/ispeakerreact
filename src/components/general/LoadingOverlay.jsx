const LoadingOverlay = () => {
    return (
        <div
            id="loader-wrapper"
            className="loading-overlay fixed inset-0 flex items-center justify-center z-[10000] bg-base-100">
            <span className="loading loading-spinner loading-lg">
                <span className="invisible">Loading...</span>
            </span>
        </div>
    );
};

export default LoadingOverlay;
