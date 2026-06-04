// tailwind.config.js
// Merge these additions into your existing Tailwind config

/** @type {import('tailwindcss').Config} */
export default  {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-deep":     "#020810",
        "bg-dark":     "#060f1e",
        "bg-card":     "#0b1828",
        "blue-bright": "#1a6fff",
        "blue-mid":    "#0d4cc5",
        "teal":        "#00c8d4",
        "teal-dim":    "#009aaa",
      },
      fontFamily: {
        display: ["Barlow Condensed", "sans-serif"],
        barlow:  ["Barlow", "sans-serif"],
        body:    ["DM Sans", "sans-serif"],
      },
      animation: {
        marquee:  "marquee 28s linear infinite",
        bounceY:  "bounceY 2.2s ease-in-out infinite",
        fadeUp1:  "fadeUp 0.7s 0.1s both",
        fadeUp2:  "fadeUp 0.7s 0.3s both",
        fadeUp3:  "fadeUp 0.7s 0.5s both",
        fadeUp4:  "fadeUp 0.7s 0.7s both",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        bounceY: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(8px)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

/**
 * Also add this import to your global CSS file (e.g. index.css / globals.css):
 *
 * @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,600;0,700;0,900;1,900&family=Barlow+Condensed:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
 */