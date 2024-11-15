import { useEffect, useState } from "react";
import { Button, Card, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { InfoCircle } from "react-bootstrap-icons";
import AccentLocalStorage from "../../utils/AccentLocalStorage";
import { isElectron } from "../../utils/isElectron";
import AccentDropdown from "../general/AccentDropdown";
import LoadingOverlay from "../general/LoadingOverlay";
import TopNavBar from "../general/TopNavBar";
import { getFileFromIndexedDB, saveFileToIndexedDB } from "../setting_page/offlineStorageDb";
import ExerciseDetailPage from "./ExerciseDetailPage";

const ExercisePage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAccent, setSelectedAccent] = AccentLocalStorage();
    const [selectedExercise, setSelectedExercise] = useState(null);

    const TooltipIcon = ({ info }) => (
        <OverlayTrigger overlay={<Tooltip>{info}</Tooltip>} trigger={["hover", "focus"]}>
            <InfoCircle className="ms-2" />
        </OverlayTrigger>
    );

    const selectedAccentOptions = [
        { name: "American English", value: "american" },
        { name: "British English", value: "british" },
    ];

    const handleSelectExercise = (exercise, heading) => {
        setSelectedExercise({
            id: exercise.id,
            title: exercise.title,
            accent: selectedAccentOptions.find((item) => item.value === selectedAccent).name,
            file: exercise.file, // Only pass the file name
            heading: heading,
        });
    };

    useEffect(() => {
        document.title = `Exercises | iSpeakerReact v${__APP_VERSION__}`;
    }, []);

    const ExerciseCard = ({ heading, titles, info, file }) => (
        <Col>
            <Card className="mb-4 h-100 shadow-sm">
                <Card.Header className="fw-semibold">{heading}</Card.Header>
                <Card.Body>
                    {titles
                        .filter(({ american, british }) => {
                            if (selectedAccent === "american" && american === false) return false;
                            if (selectedAccent === "british" && british === false) return false;
                            return true;
                        })
                        .map((exercise, index) => (
                            <Card.Text key={index} className="">
                                <Button
                                    variant="link"
                                    className="p-0 m-0"
                                    onClick={() => handleSelectExercise({ ...exercise, file }, heading)}>
                                    {exercise.title}
                                </Button>
                                <TooltipIcon
                                    info={exercise["info-random"] ? exercise["info-random"] : exercise.info || info}
                                />
                            </Card.Text>
                        ))}
                </Card.Body>
            </Card>
        </Col>
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // If it's not an Electron environment, check IndexedDB first
                if (!isElectron()) {
                    const cachedDataBlob = await getFileFromIndexedDB("exercise_list.json", "json");

                    if (cachedDataBlob) {
                        // Convert Blob to text, then parse the JSON
                        const cachedDataText = await cachedDataBlob.text();
                        const cachedData = JSON.parse(cachedDataText);

                        setData(cachedData.exerciseList);
                        setLoading(false);

                        return;
                    }
                }

                // If not in IndexedDB or running in Electron, fetch from the network
                const response = await fetch(`${import.meta.env.BASE_URL}json/exercise_list.json`);
                const data = await response.json();

                setData(data.exerciseList);
                setLoading(false);

                // Save the fetched data to IndexedDB (excluding Electron)
                if (!isElectron()) {
                    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                    await saveFileToIndexedDB("exercise_list.json", blob, "json");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Error while loading the data for this section. Please check your Internet connection.");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Save the selected accent to localStorage
        const savedSettings = JSON.parse(localStorage.getItem("ispeaker")) || {};
        savedSettings.selectedAccent = selectedAccent;
        localStorage.setItem("ispeaker", JSON.stringify(savedSettings));
    }, [selectedAccent]);

    const handleGoBack = () => {
        setSelectedExercise(null);
    };

    return (
        <>
            <TopNavBar />
            <h1 className="fw-semibold">Exercises</h1>
            {selectedExercise ? (
                <ExerciseDetailPage
                    heading={selectedExercise.heading}
                    id={selectedExercise.id}
                    title={selectedExercise.title}
                    accent={selectedExercise.accent}
                    instructions={selectedExercise.instructions}
                    file={selectedExercise.file}
                    onBack={handleGoBack}
                />
            ) : (
                <>
                    <AccentDropdown onAccentChange={setSelectedAccent} />
                    <p>Select an exercise to get started.</p>
                    {loading ? (
                        <LoadingOverlay />
                    ) : (
                        <Row xs={1} md={4} className="g-4 mt-1 d-flex justify-content-center">
                            {data.map((section, index) => (
                                <ExerciseCard
                                    key={index}
                                    heading={section.heading}
                                    titles={section.titles}
                                    info={section.info}
                                    file={section.file}
                                />
                            ))}
                        </Row>
                    )}
                </>
            )}
        </>
    );
};

export default ExercisePage;
