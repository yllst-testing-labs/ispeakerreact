import React from "react";
import { FaGithub } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { Toaster } from "sonner";
import Container from "./ui/Container";
import { isElectron } from "./utils/isElectron";
import { sonnerSuccessToast } from "./utils/sonnerCustomToast";

const handleOpenExternal = (url) => {
    if (isElectron()) {
        window.electron.openExternal(url);
    } else {
        window.open(url, "_blank", "noopener,noreferrer");
    }
};

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("React Error Boundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleCopy = () => {
        const { error, errorInfo } = this.state;
        const fullError = `
\`\`\`
${error?.toString()}\n\nStack Trace:\n${errorInfo?.componentStack}
\`\`\`
`;
        navigator.clipboard.writeText(fullError).then(() => {
            sonnerSuccessToast(this.props.t("toast.appCrashCopySuccess"));
        });
    };

    handleRefresh = () => location.reload();

    render() {
        const { hasError, error, errorInfo } = this.state;
        const { t } = this.props;

        if (hasError) {
            return (
                <Container>
                    <div className="grid min-h-screen place-items-center">
                        <div className="rounded-lg bg-red-50 p-6 text-red-700 dark:bg-red-300 dark:text-black">
                            <h2 className="mb-4 text-2xl font-bold">
                                🚨 {t("appCrash.appCrashedTitle")}
                            </h2>
                            <p className="mb-4">{t("appCrash.appCrashedDesc")}</p>
                            <div className="card bg-base-100 card-md max-h-64 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap shadow-sm">
                                <div className="card-body">
                                    <code className="font-mono! dark:text-red-200">
                                        {error?.toString()}
                                        {"\n"}
                                        {errorInfo?.componentStack}
                                    </code>
                                </div>
                            </div>
                            <div className="my-6 flex flex-wrap justify-center gap-2 px-8">
                                <button onClick={this.handleCopy} className="btn btn-primary">
                                    <HiOutlineClipboardCopy className="h-5 w-5" />
                                    {t("appCrash.copyBtn")}
                                </button>
                                <button
                                    onClick={() =>
                                        handleOpenExternal(
                                            "https://github.com/yllst-testing-labs/ispeakerreact/issues"
                                        )
                                    }
                                    className="btn btn-info"
                                >
                                    <FaGithub className="h-5 w-5" />
                                    {t("appCrash.openGitHubBtn")}
                                </button>
                                <button onClick={this.handleRefresh} className="btn btn-secondary">
                                    <FiRefreshCw className="h-5 w-5" />
                                    {t("appCrash.refreshBtn")}
                                </button>
                            </div>
                        </div>
                    </div>
                    <Toaster
                        className="flex justify-center"
                        position="bottom-center"
                        duration="7000"
                    />
                </Container>
            );
        }

        return this.props.children;
    }
}
