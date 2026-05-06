import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#27AE60',
          navy: '#2C3E50',
        },
      },
      fontFamily: {
        sans: [
          'Meiryo',
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'Noto Sans JP',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 8px 24px rgba(44, 62, 80, 0.10)',
      },
    },
  },
  plugins: [],
} satisfies Config

