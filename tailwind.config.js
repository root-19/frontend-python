/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'Roboto',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      colors: {
        border: "#E5E7EB",
        input: "#E5E7EB",
        ring: "#7C3AED",
        background: "#FFFFFF",
        foreground: "#111827",
        primary: {
          DEFAULT: "#7C3AED",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#111827",
        },
        destructive: {
          DEFAULT: "#DC2626",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#4B5563",
        },
        accent: {
          DEFAULT: "#A259FF",
          foreground: "#FFFFFF",
        },
        panel: {
          DEFAULT: "#FFFFFF",
        },
        placeholder: {
          DEFAULT: "#6B7280",
        },
        maya: {
          DEFAULT: "#00d08a",
          foreground: "#062b21",
        },
        gcash: {
          DEFAULT: "#0072ce",
          foreground: "#e6f3ff",
        },
        success: {
          DEFAULT: "#16A34A",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "1.5rem",
        md: "1.25rem",
        sm: "1rem",
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        softGlow: {
          '0%': { boxShadow: '0 0 0 rgba(162,89,255,0.0)' },
          '100%': { boxShadow: '0 0 40px rgba(162,89,255,0.25)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-700px 0' },
          '100%': { backgroundPosition: '700px 0' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 400ms ease-out both',
        shimmer: 'shimmer 1.8s linear infinite',
        glow: 'softGlow 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
