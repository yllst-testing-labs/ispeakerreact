import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AccentLocalStorage from "../../utils/AccentLocalStorage";

// Emoji SVGs import
import UKFlagEmoji from "../../emojiSvg/emoji_u1f1ec_1f1e7.svg";
import USFlagEmoji from "../../emojiSvg/emoji_u1f1fa_1f1f8.svg";

const AccentDropdown = ({ onAccentChange }) => {
    const [selectedAccent, setSelectedAccent] = AccentLocalStorage();
    const { t } = useTranslation();

    const selectedAccentOptions = [
        { name: `${t("accent.accentAmerican")}`, value: "american", emoji: USFlagEmoji },
        { name: `${t("accent.accentBritish")}`, value: "british", emoji: UKFlagEmoji },
    ];

    useEffect(() => {
        const currentSettings = JSON.parse(localStorage.getItem("ispeaker")) || {};
        const updatedSettings = { ...currentSettings, selectedAccent: selectedAccent };
        localStorage.setItem("ispeaker", JSON.stringify(updatedSettings));
    }, [selectedAccent]);

    const handleAccentChange = (value) => {
        setSelectedAccent(value);
        onAccentChange(value);
    };

    return (
        <>
            <div className="flex items-center space-x-4">
                <p className="font-semibold">{t("accent.accentSettings")}:</p>
                <div className="dropdown">
                    <div tabIndex={0} role="button" className="btn m-1 btn-accent">
                        <img
                            src={selectedAccentOptions.find((item) => item.value === selectedAccent).emoji}
                            className="inline-block h-6 w-6"
                        />
                        {selectedAccentOptions.find((item) => item.value === selectedAccent).name}
                    </div>
                    <ul
                        tabIndex={0}
                        className="dropdown-content menu border dark:border-slate-600 bg-base-100 rounded-box z-[300] w-52 p-2 shadow-md">
                        {selectedAccentOptions.map((item) => (
                            <li key={item.value}>
                                <button
                                    type="button"
                                    className={`${
                                        selectedAccent === item.value ? "btn-active" : ""
                                    } btn btn-sm btn-block btn-ghost justify-start`}
                                    onClick={() => handleAccentChange(item.value)}>
                                    <img src={item.emoji} className="inline-block h-6 w-6" /> {item.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
};

export default AccentDropdown;
