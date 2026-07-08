import type { Config } from "tailwindcss";

/**
 * Lighthouse Classes — "Warm Ivory" theme.
 * Token names are kept (navy = deep ink surfaces, ocean = primary accent)
 * so components stay stable; the values implement the premium warm palette:
 * ivory backgrounds, espresso ink, deep crimson accent, warm gold highlights.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Espresso ink — dark surfaces, primary text, footer
        navy: {
          50: "#f7f3ec",
          100: "#ece5d8",
          200: "#d8cdb9",
          300: "#bfb094",
          400: "#a08e72",
          500: "#847258",
          600: "#675845",
          700: "#4d4136",
          800: "#37302a",
          900: "#211c17",
          950: "#161210",
        },
        // Deep crimson — primary accent (links, active states, progress)
        ocean: {
          50: "#fdf3f3",
          100: "#fbe5e5",
          200: "#f6cfd0",
          300: "#eda9ab",
          400: "#e07a7d",
          500: "#cd5257",
          600: "#b3383c",
          700: "#962b31",
          800: "#7d272c",
          900: "#682428",
          950: "#390f11",
        },
        gold: {
          50: "#fefbe8",
          100: "#fff7c2",
          200: "#ffec88",
          300: "#ffd944",
          400: "#f4b400",
          500: "#e5a000",
          600: "#c67c02",
          700: "#9e5706",
          800: "#82440c",
          900: "#6f3810",
          950: "#411c05",
        },
        surface: {
          light: "#faf6ee",
          card: "#ffffff",
          dark: "#161210",
          "dark-card": "#211c17",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        urdu: ["var(--font-urdu)", "Noto Nastaliq Urdu", "serif"],
        deva: ["var(--font-deva)", "Noto Serif Devanagari", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgb(33 28 23 / 0.07), 0 8px 24px -4px rgb(33 28 23 / 0.07)",
        lifted: "0 4px 16px -4px rgb(33 28 23 / 0.10), 0 16px 48px -8px rgb(33 28 23 / 0.14)",
        glow: "0 0 32px -4px rgb(244 180 0 / 0.45)",
        "glow-ocean": "0 0 40px -8px rgb(179 56 60 / 0.45)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgb(244 180 0 / 0.14), transparent)",
        "gold-shine":
          "linear-gradient(105deg, transparent 40%, rgb(255 236 136 / 0.55) 50%, transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        beam: {
          "0%, 100%": { transform: "rotate(-14deg)", opacity: "0.6" },
          "50%": { transform: "rotate(14deg)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        waves: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease both",
        "scale-in": "scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        beam: "beam 7s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite",
        waves: "waves 18s linear infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
