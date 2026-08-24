import type { Config } from "tailwindcss";

/** Reads a CSS custom property holding `R G B` channels so /opacity modifiers work. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Tajawal", "ui-sans-serif", "system-ui"],
        arabic: ["Cairo", "Tajawal", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        /* ── Semantic tones: colour that means something ──
           brand = identity, the rest = state. Nothing else is coloured. */
        brand: token("brand"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        info: token("info"),

        /* Fixed-dark counterparts, for fills that carry white text */
        "brand-solid": token("brand-solid"),
        "success-solid": token("success-solid"),
        "warning-solid": token("warning-solid"),
        "danger-solid": token("danger-solid"),
        "info-solid": token("info-solid"),

        /* ── Semantic surface + text tokens (light/dark aware) ── */
        canvas: token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          sunken: token("surface-sunken"),
          hover: token("surface-hover"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        fg: {
          DEFAULT: token("fg"),
          muted: token("fg-muted"),
          subtle: token("fg-subtle"),
        },
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(var(--shadow-color) / 0.05)",
        card: "0 1px 2px 0 rgb(var(--shadow-color) / 0.04), 0 1px 3px 0 rgb(var(--shadow-color) / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(var(--shadow-color) / 0.07), 0 2px 4px -2px rgb(var(--shadow-color) / 0.05)",
        pop: "0 10px 24px -6px rgb(var(--shadow-color) / 0.14), 0 4px 8px -4px rgb(var(--shadow-color) / 0.08)",
        overlay:
          "0 20px 48px -12px rgb(var(--shadow-color) / 0.24), 0 8px 16px -8px rgb(var(--shadow-color) / 0.12)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      zIndex: {
        sidebar: "40",
        header: "30",
        drawer: "50",
        modal: "60",
        popover: "70",
        toast: "80",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "fly-out": "flyOut var(--fly-duration, 5s) ease-in var(--fly-delay, 0s) infinite",
        "pop-in": "popIn 0.14s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        popIn: {
          "0%": { transform: "scale(0.96) translateY(-4px)", opacity: "0" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        flyOut: {
          "0%":   { transform: "scale(0.08)", opacity: "0" },
          "10%":  { opacity: "1" },
          "85%":  { opacity: "0.9" },
          "100%": { transform: "scale(2.8)", opacity: "0" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-hero": "linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #6d28d9 100%)",
        "gradient-brand": "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
