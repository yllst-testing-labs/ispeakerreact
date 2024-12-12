import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AccentLocalStorage from "../../utils/AccentLocalStorage";

const AccentDropdown = ({ onAccentChange }) => {
    const [selectedAccent, setSelectedAccent] = AccentLocalStorage();
    const { t } = useTranslation();

    const selectedAccentOptions = [
        { name: `${t("accent.accentAmerican")}`, value: "american", emoji: "🇺🇸" },
        { name: `${t("accent.accentBritish")}`, value: "british", emoji: "🇬🇧" },
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
                        <span className="noto-color-emoji">
                            {selectedAccentOptions.find((item) => item.value === selectedAccent).emoji}
                        </span>{" "}
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
                                    <span className="noto-color-emoji">{item.emoji}</span> {item.name}
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
