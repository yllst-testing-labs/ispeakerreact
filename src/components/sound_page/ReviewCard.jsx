import he from "he";
import { useTranslation } from "react-i18next";
import {
    BsEmojiFrown,
    BsEmojiFrownFill,
    BsEmojiNeutral,
    BsEmojiNeutralFill,
    BsEmojiSmile,
    BsEmojiSmileFill,
} from "react-icons/bs";
import { useReview } from "./hooks/useReview";

const ReviewCard = ({ sound, accent, index, soundsData }) => {
    const { t } = useTranslation();

    // Integrate the useReview hook
    const { review, handleReviewClick } = useReview(sound, accent, index, soundsData);

    // Local function for emoji styling
    const emojiStyle = (reviewType) => {
        const styles = {
            good: "text-success",
            neutral: "text-warning",
            bad: "text-error",
        };
        return review === reviewType ? styles[reviewType] : "";
    };

    return (
        <div className="card card-bordered dark:border-slate-600 shadow-md flex flex-col justify-between h-auto pb-6">
            <div className="card-body">
                <p className="mb-2 text-center">
                    {t("sound_page.reviewInstructions", { phoneme: he.decode(sound.phoneme) })}
                </p>
                <div className="flex flex-row justify-center items-center space-x-4">
                    <a onClick={() => handleReviewClick("good")}>
                        {review === "good" ? (
                            <BsEmojiSmileFill size={52} role="button" className={`${emojiStyle("good")}`} />
                        ) : (
                            <BsEmojiSmile size={52} role="button" className={`${emojiStyle("good")}`} />
                        )}
                    </a>
                    <a onClick={() => handleReviewClick("neutral")}>
                        {review === "neutral" ? (
                            <BsEmojiNeutralFill size={52} role="button" className={`${emojiStyle("neutral")}`} />
                        ) : (
                            <BsEmojiNeutral size={52} role="button" className={`${emojiStyle("neutral")}`} />
                        )}
                    </a>
                    <a onClick={() => handleReviewClick("bad")}>
                        {review === "bad" ? (
                            <BsEmojiFrownFill size={52} role="button" className={`${emojiStyle("bad")}`} />
                        ) : (
                            <BsEmojiFrown size={52} role="button" className={`${emojiStyle("bad")}`} />
                        )}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ReviewCard;
