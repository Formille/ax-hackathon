import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0b12",
          soft: "#15151f",
          card: "#1b1b27",
        },
        brand: {
          DEFAULT: "#7c5cff",
          soft: "#9d86ff",
        },
        accent: "#33e1c0",
        gold: "#ffd45e",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "grow-bar": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.35s ease-out both",
        "grow-bar": "grow-bar 0.9s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
