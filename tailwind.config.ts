import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#001489',
          light: '#5494FF',
        },
        accent: {
          teal: '#4FC7BA',
          navy: '#171A47',
          orange: '#FFAB4D',
          coral: '#E86B63',
          lavender: '#ADB8CF',
          purple: '#9652FF',
          light: '#FFF2F2',
        },
      },
    },
  },
  plugins: [],
};

export default config;

