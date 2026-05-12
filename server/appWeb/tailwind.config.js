/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#060b14',
        surface: '#0d1526',
        card: '#111827',
        cardHover: '#1a2540',
        borderLight: '#2d3f5c',
        borderNormal: '#1f2d45',
        textMain: '#e8f0fe',
        textMuted: '#64748b',
        textSoft: '#94a3b8',
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        primaryGlow: 'rgba(99,102,241,.18)',
        success: '#10b981',
        successBg: 'rgba(16,185,129,.12)',
        danger: '#ef4444',
        dangerBg: 'rgba(239,68,68,.12)',
        warning: '#f59e0b',
        warningBg: 'rgba(245,158,11,.12)',
        info: '#3b82f6',
        infoBg: 'rgba(59,130,246,.12)',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
