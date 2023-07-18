import React from 'react';

export const Alert: React.FC = () => (
  <svg className="h-4 w-4 text-white fill-current" viewBox="0 0 512 512">
    <path d="M503.191 381.957c-.055-.096-.111-.19-.168-.286L312.267 63.218l-.059-.098c-9.104-15.01-23.51-25.577-40.561-29.752-17.053-4.178-34.709-1.461-49.72 7.644a66 66 0 0 0-22.108 22.109l-.058.097L9.004 381.669c-.057.096-.113.191-.168.287-8.779 15.203-11.112 32.915-6.569 49.872 4.543 16.958 15.416 31.131 30.62 39.91a65.88 65.88 0 0 0 32.143 8.804l.228.001h381.513l.227.001c36.237-.399 65.395-30.205 64.997-66.444a65.86 65.86 0 0 0-8.804-32.143zm-56.552 57.224H65.389a24.397 24.397 0 0 1-11.82-3.263c-5.635-3.253-9.665-8.507-11.349-14.792a24.196 24.196 0 0 1 2.365-18.364L235.211 84.53a24.453 24.453 0 0 1 8.169-8.154c5.564-3.374 12.11-4.381 18.429-2.833 6.305 1.544 11.633 5.444 15.009 10.986L467.44 402.76a24.402 24.402 0 0 1 3.194 11.793c.149 13.401-10.608 24.428-23.995 24.628z" />
    <path d="M256.013 168.924c-11.422 0-20.681 9.26-20.681 20.681v90.085c0 11.423 9.26 20.681 20.681 20.681 11.423 0 20.681-9.259 20.681-20.681v-90.085c.001-11.421-9.258-20.681-20.681-20.681zM270.635 355.151c-3.843-3.851-9.173-6.057-14.624-6.057a20.831 20.831 0 0 0-14.624 6.057c-3.842 3.851-6.057 9.182-6.057 14.624 0 5.452 2.215 10.774 6.057 14.624a20.822 20.822 0 0 0 14.624 6.057c5.45 0 10.772-2.206 14.624-6.057a20.806 20.806 0 0 0 6.057-14.624 20.83 20.83 0 0 0-6.057-14.624z" />
  </svg>
);

export const Danger: React.FC = () => (
  <svg className="h-4 w-4 text-white fill-current" viewBox="0 0 512 512">
    <path
      d="M437.019 74.981C388.667 26.629 324.38 0 256 0S123.333 26.63 74.981 74.981 0 187.62 0 256s26.629 132.667 74.981 181.019C123.332 485.371 187.62 512 256 512s132.667-26.629 181.019-74.981C485.371 388.667 512 324.38 512 256s-26.629-132.668-74.981-181.019zM256 470.636C137.65 470.636 41.364 374.35 41.364 256S137.65 41.364 256 41.364 470.636 137.65 470.636 256 374.35 470.636 256 470.636z"
      fill="#FFF"
    />
    <path
      d="M341.22 170.781c-8.077-8.077-21.172-8.077-29.249 0L170.78 311.971c-8.077 8.077-8.077 21.172 0 29.249 4.038 4.039 9.332 6.058 14.625 6.058s10.587-2.019 14.625-6.058l141.19-141.191c8.076-8.076 8.076-21.171 0-29.248z"
      fill="#FFF"
    />
    <path
      d="M341.22 311.971l-141.191-141.19c-8.076-8.077-21.172-8.077-29.248 0-8.077 8.076-8.077 21.171 0 29.248l141.19 141.191a20.616 20.616 0 0 0 14.625 6.058 20.618 20.618 0 0 0 14.625-6.058c8.075-8.077 8.075-21.172-.001-29.249z"
      fill="#FFF"
    />
  </svg>
);

export const Done: React.FC = () => (
  <svg className="h-4 w-4 text-white fill-current" viewBox="0 0 512 512">
    <path d="M468.907 214.604c-11.423 0-20.682 9.26-20.682 20.682v20.831c-.031 54.338-21.221 105.412-59.666 143.812-38.417 38.372-89.467 59.5-143.761 59.5h-.12C132.506 459.365 41.3 368.056 41.364 255.883c.031-54.337 21.221-105.411 59.667-143.813 38.417-38.372 89.468-59.5 143.761-59.5h.12c28.672.016 56.49 5.942 82.68 17.611 10.436 4.65 22.659-.041 27.309-10.474 4.648-10.433-.04-22.659-10.474-27.309-31.516-14.043-64.989-21.173-99.492-21.192h-.144c-65.329 0-126.767 25.428-172.993 71.6C25.536 129.014.038 190.473 0 255.861c-.037 65.386 25.389 126.874 71.599 173.136 46.21 46.262 107.668 71.76 173.055 71.798h.144c65.329 0 126.767-25.427 172.993-71.6 46.262-46.209 71.76-107.668 71.798-173.066v-20.842c0-11.423-9.259-20.683-20.682-20.683z" />
    <path d="M505.942 39.803c-8.077-8.076-21.172-8.076-29.249 0L244.794 271.701l-52.609-52.609c-8.076-8.077-21.172-8.077-29.248 0-8.077 8.077-8.077 21.172 0 29.249l67.234 67.234a20.616 20.616 0 0 0 14.625 6.058 20.618 20.618 0 0 0 14.625-6.058L505.942 69.052c8.077-8.077 8.077-21.172 0-29.249z" />
  </svg>
);

export const Search: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`${className || ''} h-3 w-3 fill-current`}
    version="1.1"
    id="Capa_1"
    x="0px"
    y="0px"
    viewBox="0 0 56.966 56.966"
    width="512px"
    height="512px"
  >
    <path d="M55.146,51.887L41.588,37.786c3.486-4.144,5.396-9.358,5.396-14.786c0-12.682-10.318-23-23-23s-23,10.318-23,23  s10.318,23,23,23c4.761,0,9.298-1.436,13.177-4.162l13.661,14.208c0.571,0.593,1.339,0.92,2.162,0.92  c0.779,0,1.518-0.297,2.079-0.837C56.255,54.982,56.293,53.08,55.146,51.887z M23.984,6c9.374,0,17,7.626,17,17s-7.626,17-17,17  s-17-7.626-17-17S14.61,6,23.984,6z" />
  </svg>
);

export const Up: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="3"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={`${className || ''} w-8 h-6 `}
  >
    <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

export const Down: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="3"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={`w-8 h-6 ${className || ''}`}
  >
    <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

export const DownChevron: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={className || 'w-8 h-6'}
  >
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

export const UpChevron: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={className || 'w-8 h-6'}
  >
    <path d="M5 15l7-7 7 7" />
  </svg>
);

export const Ascending = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
    />
  </svg>
);

export const Descending = () => (
  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
    />
  </svg>
);

export const ArrowUp: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M14,20H10V11L6.5,14.5L4.08,12.08L12,4.16L19.92,12.08L17.5,14.5L14,11V20Z" />
  </svg>
);

export const ArrowDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M10,4H14V13L17.5,9.5L19.92,11.92L12,19.84L4.08,11.92L6.5,9.5L10,13V4Z" />
  </svg>
);

export const Refresh = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
      clipRule="evenodd"
    />
  </svg>
);

export const Filters: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className={`h-6 w-7 ${className || ''}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    />
  </svg>
);

export const Close: React.FC<{ className?: string; tooltip?: string }> = ({
  className,
  tooltip,
}) => (
  <svg className={`h-4 w-4 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor">
    <title>{tooltip}</title>
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const Branches: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 640 1024" className={`${className || ''}`} fill="currentColor">
    <path d="M512 192c-70.625 0-128 57.344-128 128 0 47.219 25.875 88.062 64 110.281V448c0 0 0 128-128 128-53.062 0-94.656 11.375-128 28.812V302.28099999999995c38.156-22.219 64-63.062 64-110.281 0-70.656-57.344-128-128-128S0 121.34400000000005 0 192c0 47.219 25.844 88.062 64 110.281V721.75C25.844 743.938 0 784.75 0 832c0 70.625 57.344 128 128 128s128-57.375 128-128c0-33.5-13.188-63.75-34.25-86.625C240.375 722.5 270.656 704 320 704c254 0 256-256 256-256v-17.719c38.125-22.219 64-63.062 64-110.281C640 249.34400000000005 582.625 192 512 192zM128 128c35.406 0 64 28.594 64 64s-28.594 64-64 64-64-28.594-64-64S92.594 128 128 128zM128 896c-35.406 0-64-28.625-64-64 0-35.312 28.594-64 64-64s64 28.688 64 64C192 867.375 163.406 896 128 896zM512 384c-35.375 0-64-28.594-64-64s28.625-64 64-64 64 28.594 64 64S547.375 384 512 384z" />
  </svg>
);

export const GitRepo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" className={`${className || ''}`}>
    <path
      d="M132,334.6c48.8,3.3,59.2,2.1,59.2,12c0,20.1-65.8,20.1-65.8,1.5C125.4,343,128.7,338.7,132,334.6z M160.1,217.4
 c-32.4,0-33.9,44.7-0.8,44.7C192,262.1,191.2,217.4,160.1,217.4L160.1,217.4z M481,79.2v353.6c0,26.6-21.6,48.2-48.2,48.2H79.2
 C52.6,481,31,459.4,31,432.8V79.2C31,52.6,52.6,31,79.2,31h353.6C459.4,31,481,52.6,481,79.2z M253,148.8c0,14.6,8.4,23,23,23
 c14.8,0,23.2-8.4,23.2-23c0-14.6-8.4-22.4-23.2-22.4C261.4,126.4,253,134.3,253,148.8z M231.1,194.7h-49.8
 c-25.1-6.6-81.9-4.9-81.9,47c0,18.9,9.4,32.1,21.9,38.3c-15.8,14.4-23.2,21.2-23.2,30.9c0,6.9,2.8,13.3,11.2,16.8
 c-8.9,8.4-14.1,14.5-14.1,26c0,20.2,17.6,31.9,63.8,31.9c44.4,0,70.2-16.6,70.2-45.9c0-36.8-28.4-35.5-95.2-39.6l8.4-13.5
 c17.1,4.8,74.5,6.3,74.5-42.6c0-11.7-4.9-19.9-9.4-25.8l23.5-1.8L231.1,194.7z M315.8,305.1l-13.1-1.8c-3.8-0.5-4.1-1-4.1-5.1
 V192.2h-52.8l-2.8,20.7c15.8,5.6,17.1,4.9,17.1,10.2v75.1c0,5.6-0.3,4.6-17.1,6.9v20.1h72.7L315.8,305.1z M416.7,315.3l-6.9-22.5
 c-41.1,15.4-38-12.5-38-16.8v-61h38v-25.5h-36c-2.9,0-2,2.5-2-38.8h-24.3c-2.8,27.8-11.7,39.1-34.2,41.6V215
 c20.6,0,19.9-0.9,19.9,2.6v66.9c0,28.8,11.5,41.1,41.9,41.1C389.7,325.5,405.7,320.7,416.7,315.3L416.7,315.3z"
    />
  </svg>
);

export const ArrowRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className || ''} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

export const Plus: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`${className || ''} w-4 h-4`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

export const Minus: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`${className || ''} w-4 h-4`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
  </svg>
);

export const ExternalLink: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`inline-block ${className || ''}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
  </svg>
);

export const AlertTriangle: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`inline-block ${className || ''}`}
    viewBox="0 0 24 24"
    fill="rgb(234 88 12)"
  >
    <path d="M22.56 16.3L14.89 3.58a3.43 3.43 0 0 0-5.78 0L1.44 16.3a3 3 0 0 0-.05 3A3.37 3.37 0 0 0 4.33 21h15.34a3.37 3.37 0 0 0 2.94-1.66 3 3 0 0 0-.05-3.04zm-1.7 2.05a1.31 1.31 0 0 1-1.19.65H4.33a1.31 1.31 0 0 1-1.19-.65 1 1 0 0 1 0-1l7.68-12.73a1.48 1.48 0 0 1 2.36 0l7.67 12.72a1 1 0 0 1 .01 1.01z" />
    <circle cx="12" cy="16" r="1" />
    <path d="M12 8a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V9a1 1 0 0 0-1-1z" />
  </svg>
);

export const CircularCheckmark: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path
      d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z"
      fill="currentColor"
    />
  </svg>
);

export const CircularAlert: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path
      d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"
      fill="currentColor"
    />
  </svg>
);

export const Artifactory: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 48 48" className={className}>
    <rect width="48" height="48" fill="none" />
    <rect x="5" y="42.4" width="38" height="2.92" />
    <path d="M23.93,34.48A16.24,16.24,0,1,1,40.17,18.24,16.25,16.25,0,0,1,23.93,34.48Zm0-29.38A13.14,13.14,0,1,0,37.07,18.24,13.16,13.16,0,0,0,23.93,5.1Z" />
  </svg>
);

export const Git: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24pt" height="24pt" viewBox="24 0 92 92" className={`-mr-1.5 ${className}`}>
    <path
      style={{
        stroke: 'none',
        fillRule: 'nonzero',
        fillOpacity: 1,
      }}
      d="M90.156 41.965 50.036 1.848a5.918 5.918 0 0 0-8.372 0l-8.328 8.332 10.566 10.566a7.03 7.03 0 0 1 7.23 1.684 7.034 7.034 0 0 1 1.669 7.277l10.187 10.184a7.028 7.028 0 0 1 7.278 1.672 7.04 7.04 0 0 1 0 9.957 7.05 7.05 0 0 1-9.965 0 7.044 7.044 0 0 1-1.528-7.66l-9.5-9.497V59.36a7.04 7.04 0 0 1 1.86 11.29 7.04 7.04 0 0 1-9.957 0 7.04 7.04 0 0 1 0-9.958 7.06 7.06 0 0 1 2.304-1.539V33.926a7.049 7.049 0 0 1-3.82-9.234L29.242 14.272 1.73 41.777a5.925 5.925 0 0 0 0 8.371L41.852 90.27a5.925 5.925 0 0 0 8.37 0l39.934-39.934a5.925 5.925 0 0 0 0-8.371"
    />
  </svg>
);

export const PullRequest: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24px" height="24px" className={className} viewBox="0 0 512 512">
    <path d="M411.5,352.8V198.3c0-16.8,0-48.4-11.2-74.5c-14-33.5-41-51.2-79.1-51.2h-88.4L278.3,27 c6.5-6.5,6.5-16.8,0-22.3l0,0c-2.8-2.8-7.4-4.7-11.2-4.7c-4.7,0-8.4,1.9-11.2,4.7L193.6,67c-9.3-33.5-41-57.7-77.3-57.7 c-43.8,0-80.1,36.3-80.1,80.1c0,19.5,7.4,38.2,19.5,53.1c11.2,13,26.1,21.4,42.8,25.1v186.2c-16.8,3.7-31.7,13-42.8,25.1 c-13,14.9-19.5,33.5-19.5,52.1c0,43.8,36.3,80.1,80.1,80.1s80.1-36.3,80.1-80.1c0-19.5-7.4-39.1-20.5-54 c-12.1-13-27-21.4-44.7-25.1V166.6c16.8-2.8,32.6-12.1,44.7-25.1c8.4-9.3,14.9-21.4,17.7-33.5l64.2,64.2c2.8,2.8,6.5,4.7,11.2,4.7 s8.4-1.9,11.2-4.7c2.8-2.8,4.7-6.5,4.7-11.2c0-4.7-1.9-8.4-4.7-11.2l0,0l-46.5-45.6h88.4c23.3,0,38.2,8.4,47.5,27 c9.3,19.5,11.2,47.5,11.2,67v154.5c-16.8,2.8-32.6,12.1-44.7,25.1c-13,14.9-20.5,33.5-20.5,54c0,43.8,36.3,80.1,80.1,80.1 s80.1-36.3,80.1-80.1c0-19.5-7.4-38.2-19.5-53.1C443.1,365.8,428.2,356.5,411.5,352.8z M163.8,431c0,26.1-21.4,48.4-48.4,48.4 C89.4,479.4,67,458,67,431s21.4-48.4,48.4-48.4C142.4,383.5,163.8,404.9,163.8,431z M115.4,135.9c-26.1,0-48.4-21.4-48.4-48.4 s21.4-48.4,48.4-48.4c26.1,0,48.4,21.4,48.4,48.4S142.4,135.9,115.4,135.9z M394.7,479.4c-26.1,0-48.4-21.4-48.4-48.4 s21.4-48.4,48.4-48.4c27,0,48.4,21.4,48.4,48.4C443.1,458,420.8,479.4,394.7,479.4z" />
  </svg>
);

export const Info: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    width="24px"
    height="24px"
    className={className}
    fill="currentColor"
  >
    <path d="M 12 2 C 6.4889971 2 2 6.4889971 2 12 C 2 17.511003 6.4889971 22 12 22 C 17.511003 22 22 17.511003 22 12 C 22 6.4889971 17.511003 2 12 2 z M 12 4 C 16.430123 4 20 7.5698774 20 12 C 20 16.430123 16.430123 20 12 20 C 7.5698774 20 4 16.430123 4 12 C 4 7.5698774 7.5698774 4 12 4 z M 11 7 L 11 9 L 13 9 L 13 7 L 11 7 z M 11 11 L 11 17 L 13 17 L 13 11 L 11 11 z" />
  </svg>
);

export const ArrowDown2: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3.6748C12.6213 3.6748 13.125 4.17848 13.125 4.7998L13.125 19.1998C13.125 19.8211 12.6213 20.3248 12 20.3248C11.3787 20.3248 10.875 19.8211 10.875 19.1998L10.875 4.7998C10.875 4.17848 11.3787 3.6748 12 3.6748Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.40446 13.6034C6.8438 13.1641 7.55611 13.1641 7.99545 13.6034L12 17.6079L16.0045 13.6034C16.4438 13.1641 17.1561 13.1641 17.5954 13.6034C18.0348 14.0428 18.0348 14.7551 17.5954 15.1944L12.7954 19.9944C12.3561 20.4338 11.6438 20.4338 11.2045 19.9944L6.40446 15.1944C5.96512 14.7551 5.96512 14.0428 6.40446 13.6034Z"
      fill="currentColor"
    />
  </svg>
);

export const Download: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="20" height="20" fill="none" className={className}>
    <path
      stroke="currentColor"
      d="M10.834 1.666H5a1.667 1.667 0 0 0-1.667 1.667v13.333A1.667 1.667 0 0 0 5 18.333h10a1.667 1.667 0 0 0 1.667-1.667V7.499l-5.834-5.833Z"
    />
    <path
      stroke="currentColor"
      d="M10.834 1.666v5.833h5.833M8 12.916l2.083 2.083 2.083-2.083M10.084 15v-5"
    />
  </svg>
);

export const TickCircle: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className, size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} fill="none" className={className} viewBox="0 0 24 24">
    <path
      fill={color}
      fillRule="evenodd"
      d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Z"
      clipRule="evenodd"
    />
    <path
      fill={color}
      fillRule="evenodd"
      d="M17.434 8.293a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414 0L7.293 12.98a1 1 0 1 1 1.414-1.414l2.02 2.02 5.293-5.293a1 1 0 0 1 1.414 0Z"
      clipRule="evenodd"
    />
  </svg>
);

export const ReleasePipeline: React.FC<{
  className?: string;
  size?: number;
  color?: string;
}> = ({ className, size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" className={className} fill="none">
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M10 16.75v-7.5M7 12.25l3-3 3 3"
    />
    <path
      stroke={color}
      strokeLinejoin="round"
      strokeWidth="1.3"
      d="M11.5 6.25h-3v-3h3zM17.5 6.25h-3v-3h3zM5.5 6.25h-3v-3h3z"
    />
  </svg>
);
