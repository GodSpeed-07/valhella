/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030303",
        accent: {
          blue: "#3b82f6",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 30px -5px rgba(139, 92, 246, 0.3)",
        "glow-blue": "0 0 30px -5px rgba(59, 130, 246, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "wave-slow": "wave 1.6s ease-in-out infinite",
        "wave-medium": "wave 1.2s ease-in-out infinite",
        "wave-fast": "wave 0.8s ease-in-out infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
}
