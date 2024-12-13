import he from "he";
import React from "react";

const SoundCardList = React.memo(
    ({ sound, index, selectedAccent, handlePracticeClick, getBadgeColor, getReviewText, getReviewKey, reviews, t }) => {
        const badgeColor = getBadgeColor(sound, index);
        const reviewKey = getReviewKey(sound, index);
        const reviewText = badgeColor ? getReviewText(reviews[reviewKey]) : null;

        return (
            <div className="indicator">
                {badgeColor && (
                    <span className={`indicator-item indicator-center badge ${badgeColor}`}>{reviewText}</span>
                )}
                <div className="card card-bordered dark:border-slate-600 shadow-md flex flex-col justify-between h-auto pb-6">
                    <div className="card-body items-center text-center flex-grow">
                        <h2 className="card-title">{he.decode(sound.phoneme)}</h2>
                        <p>{sound.example_word}</p>
                    </div>
                    <div className="card-actions px-6">
                        <button
                            className="btn btn-primary w-full"
                            onClick={() => handlePracticeClick(sound, selectedAccent, index)}
                            aria-label={t("sound_page.practiceBtn", { sound: he.decode(sound.phoneme) })}>
                            {t("sound_page.practiceBtn")}
                        </button>
                    </div>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Avoid re-rendering if props have not changed
        return (
            prevProps.sound === nextProps.sound &&
            prevProps.index === nextProps.index &&
            prevProps.selectedAccent === nextProps.selectedAccent &&
            prevProps.reviews === nextProps.reviews
        );
    }
);

SoundCardList.displayName = "SoundCard";

export default SoundCardList;
