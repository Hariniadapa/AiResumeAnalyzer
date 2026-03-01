/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#a87ffb",
                secondary: "#7c3aed",
            },
        },
    },
    plugins: [],
}
