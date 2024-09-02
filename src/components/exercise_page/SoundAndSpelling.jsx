import he from "he";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Col, Row, Spinner, Stack } from "react-bootstrap";
import { ArrowRightCircle, CheckCircleFill, VolumeUp, VolumeUpFill, XCircle, XCircleFill } from "react-bootstrap-icons";
import { ShuffleArray } from "../../utils/ShuffleArray";

const SoundAndSpelling = ({ quiz, onAnswer, onQuit }) => {
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
    const [shuffledQuiz, setShuffledQuiz] = useState([]);
    const [shuffledOptions, setShuffledOptions] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [buttonsDisabled, setButtonsDisabled] = useState(false);
    const [currentQuestionText, setCurrentQuestionText] = useState("");
    const [currentAudioSrc, setCurrentAudioSrc] = useState("");
    const [selectedOption, setSelectedOption] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Use a ref to manage the audio element
    const audioRef = useRef(null);

    const filterAndShuffleQuiz = (quiz) => {
        const uniqueQuiz = Array.from(new Set(quiz.map((item) => JSON.stringify(item)))).map((item) =>
            JSON.parse(item)
        );
        return ShuffleArray(uniqueQuiz);
    };

    const loadQuiz = useCallback((quizData) => {
        // Shuffle the answer options
        const shuffledOptions = ShuffleArray([...quizData.data]);
        setShuffledOptions(shuffledOptions);

        // Set the question text and audio source
        setCurrentQuestionText(quizData.question[0].text);
        setCurrentAudioSrc(`/media/exercise/mp3/${quizData.audio.src}.mp3`);

        setButtonsDisabled(false);
        setSelectedOption(null);
    }, []);

    useEffect(() => {
        if (quiz && quiz.length > 0) {
            // Filter out unique items and shuffle the quiz array
            const uniqueShuffledQuiz = filterAndShuffleQuiz(quiz);
            setShuffledQuiz(uniqueShuffledQuiz);
            // Reset currentQuizIndex to 0
            setCurrentQuizIndex(0);
        }
    }, [quiz]);

    useEffect(() => {
        if (shuffledQuiz.length > 0 && currentQuizIndex < shuffledQuiz.length) {
            loadQuiz(shuffledQuiz[currentQuizIndex]);
        }
    }, [shuffledQuiz, currentQuizIndex, loadQuiz]);

    const handleAudioPlay = () => {
        if (isPlaying) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsPlaying(false);
        } else {
            setIsLoading(true);
            const newAudio = new Audio(currentAudioSrc);
            audioRef.current = newAudio;
            newAudio.load();

            // Handle when the audio can be played through
            newAudio.oncanplaythrough = () => {
                setIsLoading(false);
                setIsPlaying(true);
                newAudio.play();
            };

            // Handle when the audio ends
            newAudio.onended = () => {
                setIsPlaying(false);
            };

            // Handle any loading errors
            newAudio.onerror = () => {
                setIsLoading(false);
                setIsPlaying(false);
                console.error("Error playing audio.");
                alert("There was an error loading the audio file. Please check your connection or try again later.");
            };
        }
    };

    const handleOptionClick = (isCorrect, index) => {
        setButtonsDisabled(true);
        setSelectedOption({ index, isCorrect });

        // Replace the underscore with the selected answer
        const updatedQuestionText = currentQuestionText.replace("_", shuffledOptions[index].value);
        setCurrentQuestionText(updatedQuestionText);

        onAnswer(isCorrect ? 1 : 0, "single");
    };

    const handleNextQuiz = () => {
        if (audioRef.current) {
            // Stop the audio and remove event listeners
            audioRef.current.pause();
            audioRef.current.currentTime = 0;

            audioRef.current.oncanplaythrough = null;
            audioRef.current.onended = null;
            audioRef.current.onerror = null;

            setIsPlaying(false);
            setIsLoading(false);
        }

        if (currentQuizIndex < shuffledQuiz.length - 1) {
            setCurrentQuizIndex((prevIndex) => prevIndex + 1);
        } else {
            onQuit();
        }
    };

    return (
        <>
            <Card.Header className="fw-semibold">Question #{currentQuizIndex + 1}</Card.Header>
            <Card.Body>
                <Row className="d-flex justify-content-center g-3">
                    <Col xs={12} className="d-flex justify-content-center">
                        <Button variant="primary" onClick={handleAudioPlay} disabled={isLoading}>
                            {isLoading ? (
                                <Spinner animation="border" size="sm" />
                            ) : isPlaying ? (
                                <VolumeUpFill />
                            ) : (
                                <VolumeUp />
                            )}
                        </Button>
                    </Col>
                    <Col xs={12} className="d-flex justify-content-center">
                        <Button
                            variant={selectedOption ? (selectedOption.isCorrect ? "success" : "danger") : "none"}
                            className={`fs-4 mb-0 border-0 ${!selectedOption ? "" : ""}`}>
                            {he.decode(currentQuestionText)}
                            {selectedOption ? (
                                selectedOption.isCorrect ? (
                                    <CheckCircleFill className="ms-2" />
                                ) : (
                                    <XCircleFill className="ms-2" />
                                )
                            ) : (
                                ""
                            )}
                        </Button>
                    </Col>
                    <Col xs={12} className="d-flex justify-content-center">
                        <Stack direction="horizontal" gap={3}>
                            {shuffledOptions.map((option, index) => (
                                <Button
                                    className={`fw-bold ${buttonsDisabled ? "pe-none" : ""}`}
                                    key={index}
                                    variant={
                                        selectedOption
                                            ? selectedOption.index === index
                                                ? "secondary"
                                                : "outline-secondary"
                                            : "outline-secondary"
                                    }
                                    onClick={() => handleOptionClick(option.answer === "true", index)}>
                                    {option.value}
                                </Button>
                            ))}
                        </Stack>
                    </Col>
                </Row>
                <div className="d-flex justify-content-end mt-3">
                    {currentQuizIndex < shuffledQuiz.length - 1 && (
                        <Button variant="secondary" className="ms-2" onClick={handleNextQuiz}>
                            <ArrowRightCircle /> Next
                        </Button>
                    )}
                    <Button variant="danger" className="ms-2" onClick={onQuit}>
                        <XCircle /> Quit
                    </Button>
                </div>
            </Card.Body>
        </>
    );
};

export default SoundAndSpelling;