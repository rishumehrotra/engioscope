const withOpacity =
  variableName =>
  ({ opacityValue }) => {
    return opacityValue === undefined
      ? `rgb(var(${variableName}))`
      : `rgba(var(${variableName}), ${opacityValue})`;
  };

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['ui/**/*.{ts,tsx,js,jsx,html}'],
  theme: {
    extend: {
      textColor: {
        theme: {
          'base': withOpacity('--color-text-base'),
          'helptext': withOpacity('--color-text-helptext'),
          'icon': withOpacity('--color-text-icon'),
          'icon-active': withOpacity('--color-text-icon-active'),
        },
      },

      backgroundColor: {
        theme: {
          'col-header': withOpacity('--color-bg-col-header'),
          'secondary': withOpacity('--color-bg-secondary'),
          'hover': withOpacity('--color-bg-hover'),
        },
      },

      borderColor: {
        theme: {
          seperator: withOpacity('--color-border-separator'),
        },
      },
    },
  },
  variants: {},
  plugins: [require('@tailwindcss/forms')],
};
