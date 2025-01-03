import { useState } from "react";

const SpeechRecognitionTest = () => {
    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);

    const startSpeechRecognition = () => {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            setError("Your browser does not support the Web Speech API.");
            return;
        }

        // Use either webkitSpeechRecognition or SpeechRecognition
        const Recognition =
            window.webkitSpeechRecognition || window.SpeechRecognition;
        const recognition = new Recognition();

        recognition.lang = "en"; // Set the language
        recognition.interimResults = false; // Only capture final results
        recognition.maxAlternatives = 1; // Limit to one transcription

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            console.log("Speech recognition started");
        };

        recognition.onerror = (e) => {
            setError(`Error: ${e.error}`);
            console.error("Speech recognition error:", e);
        };

        recognition.onend = () => {
            setIsListening(false);
            console.log("Speech recognition stopped");
        };

        recognition.onresult = (e) => {
            const recognizedText = e.results[0][0].transcript;
            console.log("Recognized text:", recognizedText);
            setTranscript(recognizedText);
        };

        recognition.start();
    };

    return (
        <div className="text-center my-4">
            <p className="mb-4">Web Speech API Test</p>
            <button
                type="button"
                onClick={startSpeechRecognition}
                disabled={isListening}
                className="btn btn-info"
            >
                {isListening ? "Listening..." : "Start Speech Recognition"}
            </button>
            {error && (
                <p className="text-error">
                    <strong>{error}</strong>
                </p>
            )}
            <div className="my-4">
                <strong>Recognized text:</strong>
                <p>
                    {transcript || "No speech recognized yet."}
                </p>
            </div>
        </div>
    );
};

export default SpeechRecognitionTest;
