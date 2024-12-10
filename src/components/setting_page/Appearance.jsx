import { useTranslation } from "react-i18next";
import { useTheme } from "../../utils/ThemeContext/useTheme";

const AppearanceSettings = () => {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();

    const handleThemeSelect = (selectedTheme) => {
        setTheme(selectedTheme);
    };

    const getThemeOptionLabel = (currentTheme) => {
        switch (currentTheme) {
            case "auto":
                return t("settingPage.appearanceSettings.themeAuto");
            case "light":
                return t("settingPage.appearanceSettings.themeLight");
            case "dark":
                return t("settingPage.appearanceSettings.themeDark");
            default:
                return t("settingPage.appearanceSettings.themeAuto");
        }
    };

    return (
        <>
            <h4 className="font-semibold text-xl mb-4">{t("settingPage.appearanceSettings.appearanceHeading")}</h4>
            <div className="card card-bordered shadow-md w-full mb-6">
                <div className="card-body px-4 py-2">
                    <div className="flex flex-row items-center">
                        <p>{t("settingPage.appearanceSettings.themeOption")}</p>
                        <div className="dropdown">
                            <div tabIndex={0} role="button" className="btn m-1">
                                {getThemeOptionLabel(theme)}
                            </div>
                            <ul
                                tabIndex={0}
                                className="dropdown-content menu border-slate-50 bg-base-100 rounded-box z-[300] w-52 p-2 shadow-md">
                                <li>
                                    <button
                                        onClick={() => handleThemeSelect("light")}
                                        className={`${
                                            theme === "light" ? "btn-active" : ""
                                        } btn btn-sm btn-block btn-ghost justify-start`}
                                        aria-pressed={theme === "light"}>
                                        {t("settingPage.appearanceSettings.themeLight")}
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => handleThemeSelect("dark")}
                                        className={`${
                                            theme === "dark" ? "btn-active" : ""
                                        } btn btn-sm btn-block btn-ghost justify-start`}
                                        aria-pressed={theme === "dark"}>
                                        {t("settingPage.appearanceSettings.themeDark")}
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => handleThemeSelect("auto")}
                                        className={`${
                                            theme === "auto" ? "btn-active" : ""
                                        } btn btn-sm btn-block btn-ghost justify-start`}
                                        aria-pressed={theme === "auto"}>
                                        {t("settingPage.appearanceSettings.themeAuto")}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AppearanceSettings;
