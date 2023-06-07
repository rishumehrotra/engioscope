const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}), ${opacityValue})`
    }
    return `rgb(var(${variableName}))`
  }
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'ui/**/*.{ts,tsx,js,jsx,html}'
  ],
  theme: {
    extend: {
      textColor: {
        theme: {
          base: withOpacity('--color-text-base')
        }
      },
    }
  },
  variants: {},
  plugins: []
};
