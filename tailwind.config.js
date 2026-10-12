/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Primary brand (Gov Raksha blue) ─────────────────────
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // ── Surface / background tokens ──────────────────────────
        surface: {
          base:          '#fbfaf6',
          card:          '#ffffff',
          muted:         '#f8fafc',
          subtle:        '#f1f5f9',
          border:        '#e2e8f0',
          'border-strong': '#cbd5e1',
        },
        // ── Semantic status tokens ───────────────────────────────
        success: { 50: '#f0fdf4', 100: '#dcfce7', 600: '#16a34a', 700: '#15803d', 800: '#166534' },
        warning: { 50: '#fffbeb', 100: '#fef9c3', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e' },
        danger:  { 50: '#fff1f2', 100: '#fee2e2', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' },
        info:    { 50: '#f0f9ff', 100: '#dbeafe', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
        // ── Government India palette ─────────────────────────────
        gov: {
          saffron:  '#FF9933',
          navyblue: '#000080',
          ashoka:   '#138808',
        },
        // ── Sidebar tokens ───────────────────────────────────────
        sidebar: {
          bg:           '#0f172a',
          'bg-hover':   '#1e293b',
          'bg-active':  '#2563eb',
          text:         '#94a3b8',
          'text-active':'#ffffff',
          border:       '#1e293b',
        },
      },

      fontFamily: {
        sans:       ['Inter', 'Noto Sans', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'Noto Sans', 'system-ui', 'sans-serif'],
        mono:       ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      fontSize: {
        'display':   ['2.25rem', { lineHeight: '2.5rem',   fontWeight: '700' }],
        'heading-1': ['1.5rem',  { lineHeight: '2rem',     fontWeight: '700' }],
        'heading-2': ['1.25rem', { lineHeight: '1.75rem',  fontWeight: '600' }],
        'heading-3': ['1.125rem',{ lineHeight: '1.625rem', fontWeight: '600' }],
        'body':      ['0.9375rem',{ lineHeight: '1.5rem',  fontWeight: '400' }],
        'small':     ['0.875rem',{ lineHeight: '1.25rem',  fontWeight: '400' }],
        'caption':   ['0.75rem', { lineHeight: '1rem',     fontWeight: '400' }],
      },

      spacing: {
        'sidebar':    '240px',
        'sidebar-sm': '64px',
        'topbar':     '64px',
      },

      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'modal':   '0 20px 60px -12px rgb(0 0 0 / 0.25)',
        'sidebar-shadow': '4px 0 24px -4px rgb(0 0 0 / 0.15)',
      },

      keyframes: {
        'fade-in':       { from: { opacity: '0' },                                       to: { opacity: '1' } },
        'slide-up':      { from: { opacity: '0', transform: 'translateY(8px)' },         to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-down':    { from: { opacity: '0', transform: 'translateY(-8px)' },        to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' },                     to: { transform: 'translateX(0)' } },
        'slide-in-right':{ from: { transform: 'translateX(100%)' },                      to: { transform: 'translateX(0)' } },
        'skeleton':      { '0%, 100%': { opacity: '1' },                                  '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-in':        'fade-in 0.15s ease-out',
        'slide-up':       'slide-up 0.2s ease-out',
        'slide-down':     'slide-down 0.2s ease-out',
        'slide-in-left':  'slide-in-left 0.25s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'skeleton':       'skeleton 1.5s ease-in-out infinite',
      },

      borderRadius: {
        'card': '0.75rem',
        'btn':  '0.5rem',
      },
    },
  },
  plugins: [],
};
