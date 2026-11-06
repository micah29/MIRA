/** VIRA design system tokens (UI/UX Design – System Design v0) */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#2A6484',   // Primary (Dark) – Deep Solar Blue
        sky: '#4FA0D0',     // Secondary (Light) – Sky Blue
        sun: '#FFC125',     // Accent – Solar Yellow
        sunDeep: '#F59E0B',
        ice: '#F8FAFC',     // Background – Off-White/Ice
        ink: '#1E293B',     // Typography – Dark Slate
      },
      fontFamily: { sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'], head: ['Montserrat', 'Inter', 'sans-serif'] },
      boxShadow: { soft: '0 1px 2px rgba(30,41,59,.06), 0 6px 16px rgba(30,41,59,.06)' },
      backgroundImage: {
        'deep-energy': 'linear-gradient(180deg,#2A6484,#4FA0D0)',
        'deep-energy-x': 'linear-gradient(90deg,#2A6484,#4FA0D0)',
        'clean-glass': 'linear-gradient(180deg,#F8FAFC,#F1F5F9)',
      },
    },
  },
  plugins: [],
};
