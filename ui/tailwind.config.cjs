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
          'highlight': withOpacity('--color-text-highlight'),
          'icon': withOpacity('--color-text-icon'),
          'icon-active': withOpacity('--color-text-icon-active'),
        },
      },

      backgroundColor: {
        theme: {
          'col-header': withOpacity('--color-bg-col-header'),
          'secondary': withOpacity('--color-bg-secondary'),
          'hover': withOpacity('--color-bg-hover'),
          'page': withOpacity('--color-bg-page'),
          'page-content': withOpacity('--color-bg-page-content'),
          'backdrop': withOpacity('--color-bg-backdrop'),
        },
      },

      borderColor: {
        theme: {
          seperator: withOpacity('--color-border-separator'),
          input: withOpacity('--color-input-border'),
          'input-highlight': withOpacity('--color-input-highlight'),
        },
      },

      ringColor: {
        theme: {
          'input-highlight': withOpacity('--color-input-highlight'),
        }
      }
    },
  },
  variants: {},
  // eslint-disable-next-line global-require
  plugins: [require('@tailwindcss/forms')],
};
