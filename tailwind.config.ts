import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111015",
        sand: "#f7f3ee",
        slate: "#d8d3cb",
        accent: "#a86f3f",
        pine: "#1e3b35"
      },
      boxShadow: {
        premium: "0 20px 60px -30px rgba(0, 0, 0, 0.35)",
        soft: "0 12px 40px -24px rgba(17, 16, 21, 0.35)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      backgroundImage: {
        "mesh-soft": "radial-gradient(circle at 20% 10%, rgba(168,111,63,0.25), transparent 38%), radial-gradient(circle at 80% 0%, rgba(30,59,53,0.2), transparent 40%)"
      }
    }
  },
  plugins: []
};

export default config;
