import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e9ecf5",
        mist: "#090b12",
        amber: "#ffb000",
        surface: "#121722",
        muted: "#9ca7bb",
      },
      boxShadow: {
        card: "0 24px 80px rgba(0, 0, 0, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
