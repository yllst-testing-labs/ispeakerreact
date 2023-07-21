document.getElementById("installYesBtn").addEventListener("click", function () {
    registerServiceWorker("./sw-audio.js");
    localStorage.setItem("toastShown", "true");
    hideToast();
});

document.getElementById("installNoBtn").addEventListener("click", function () {
    registerServiceWorker("./sw.js");
    localStorage.setItem("toastShown", "true");
    hideToast();
});

document.getElementById("dontShowBtn").addEventListener("click", function () {
    localStorage.setItem("toastShown", "true");
    hideToast();
});

function registerServiceWorker(swFilePath) {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(swFilePath).then(
            (registration) => {
                console.log("Service worker registration succeeded:", registration);
            },
            (error) => {
                console.error(`Service worker registration failed: ${error}`);
            }
        );
    } else {
        console.error("Service workers are not supported.");
    }
}

const toastEl = document.getElementById("installToast");

function hideToast() {
    // Use Bootstrap's toast hide method
    const toast = new bootstrap.Toast(toastEl);
    toast.hide();
}

// Show the toast initially (optional)
const toastShown = localStorage.getItem("toastShown");
if (toastShown !== "true") {
    // Use Bootstrap's toast show method
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
