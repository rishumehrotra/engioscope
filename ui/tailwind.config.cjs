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
          'base-inverted': withOpacity('--color-bg-page-content'),
          'helptext': withOpacity('--color-text-helptext'),
          'helptext-emphasis': withOpacity('--color-text-helptext-emphasis'),
          'highlight': withOpacity('--color-text-highlight'),
          'icon': withOpacity('--color-text-icon'),
          'icon-active': withOpacity('--color-text-icon-active'),
          'success': withOpacity('--color-text-success'),
          'danger': withOpacity('--color-text-danger'),
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
          'tag': withOpacity('--color-bg-tag'),
          'highlight': withOpacity('--color-text-highlight'),
          'success': withOpacity('--color-bg-success'),
          'danger': withOpacity('--color-text-danger'),
          'danger-dim': withOpacity('--color-bg-danger'),
        },
      },

      borderColor: {
        theme: {
          seperator: withOpacity('--color-border-separator'),
          'seperator-light': withOpacity('--color-border-separator-light'),
          input: withOpacity('--color-input-border'),
          'input-highlight': withOpacity('--color-input-highlight'),
          'danger': withOpacity('--color-text-danger'),
        },
      },

      ringColor: {
        theme: {
          'input-highlight': withOpacity('--color-input-highlight'),
          'danger': withOpacity('--color-text-danger'),
        }
      }
    },
  },
  variants: {},
  // eslint-disable-next-line global-require
  plugins: [require('@tailwindcss/forms')],
};
