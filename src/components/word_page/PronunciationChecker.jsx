import { isElectron } from "../../utils/isElectron";

const PronunciationChecker = () => {
    if (!isElectron()) {
        console.log("feature not available in web");
    } else {
        console.log("PronunciationChecker");
    }
};

export default PronunciationChecker;
