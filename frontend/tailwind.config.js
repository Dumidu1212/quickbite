// tailwind.config.js
//
// Tailwind CSS v3 configuration.
// content array tells Tailwind which files to scan for class names —
// any class not found here will be purged from the production build.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
