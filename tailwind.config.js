/** @type {import('tailwindcss').Config} */
// Cores vêm dos tokens de src/design/tokens.ts (viram variáveis CSS). A escala "slate" é remapeada para os tons de texto do tema claro,
// para todo texto ter contraste de pelo menos 4,5:1 sobre o papel e o painel (WCAG AA).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: { bg: token('bg'), deep: token('bg-2'), card: token('card'), card2: token('bg-2'), line: token('border') },
        paper: { DEFAULT: token('bg'), 2: token('bg-2') },
        ink: { DEFAULT: token('text'), 2: token('text-2'), 3: token('text-3') },
        brand: { DEFAULT: token('brand'), soft: token('brand-soft') },
        green: { soft: token('green-soft'), line: token('green-line') },
        line: token('border'),
        track: token('track'), hover: token('hover'), mark: token('mark'), disabled: token('disabled'),
        good: { DEFAULT: token('good'), soft: token('good-soft') }, bad: { DEFAULT: token('bad'), soft: token('bad-soft') },
        slate: {
          50: token('text'), 100: token('text'), 200: token('text'),
          300: token('text-2'), 400: token('text-2'), 500: token('text-3'), 600: token('text-3'),
          700: token('border'), 800: token('bg-2'), 900: token('bg'), 950: token('bg'),
        },
      },
      borderRadius: { md: '5px', lg: '8px', xl: '10px', '2xl': '12px' },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.25rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
