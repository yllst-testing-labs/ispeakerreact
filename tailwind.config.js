/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";
import daisyui from "daisyui";

export default {
    content: ["./index.html", "./src/**/*.{html,js,jsx}"],
    theme: {
        extend: {},
    },
    plugins: [typography, daisyui],
    daisyui: {
        themes: [
            {
                light: {
                    "color-scheme": "light",
                    primary: "oklch(65.88% 0.1467 133.01)",
                    secondary: "oklch(83.66% 0.1165 66.29)",
                    accent: "oklch(85.39% 0.201 100.73)",
                    neutral: "oklch(30.98% 0.075 108.6)",
                    "base-100": "oklch(98.71% 0.02 123.72)",
                    info: "oklch(86.19% 0.047 224.14)",
                    success: "oklch(52.73% 0.1371 150.07)",
                    "success-content": "white",
                    warning: "oklch(78.39% 0.1719 68.09)",
                    error: "oklch(50.6% 0.1927 27.7)",
                },
            },
            "dim",
        ],
        darkTheme: "dim",
    },
    darkMode: ["selector", '[data-theme="dim"]'],
};
