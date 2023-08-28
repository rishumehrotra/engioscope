import React from 'react';

const Loader = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="517" fill="none">
    <g fill="#F3F4F6" clipPath="url(#a)">
      <rect width="117.728" height="16.661" x="29.432" y="98.922" rx="8.33" />
      <rect width="117.728" height="16.661" x="29.432" y="466.497" rx="8.33" />
      <rect width="117.728" height="16.661" x="163.684" y="98.922" rx="8.33" />
      <rect width="117.728" height="16.661" x="4.647" rx="8.33" />
      <rect width="589.673" height="16.661" x="4.647" y="32.28" rx="8.33" />
      <rect width="92.943" height="34.362" x="29.432" y="132.244" rx="17.181" />
      <rect width="92.943" height="34.362" x="163.684" y="132.244" rx="17.181" />
      <path
        fillRule="evenodd"
        d="M0 73.931c0-4.888 3.93-8.85 8.778-8.85h582.444c4.848 0 8.778 3.962 8.778 8.85V508.15c0 4.888-3.93 8.851-8.778 8.851H8.778C3.93 517 0 513.037 0 508.149V73.932Zm8.778-7.81c-4.278 0-7.745 3.497-7.745 7.81V508.15c0 4.313 3.467 7.81 7.745 7.81h582.444c4.278 0 7.745-3.497 7.745-7.81V73.932c0-4.314-3.467-7.81-7.745-7.81H8.778Z"
        clipRule="evenodd"
      />
      <rect width="66" height="17" x="29" y="233" rx="8.5" />
      <rect width="172" height="24" x="135" y="230" rx="4" />
      <rect width="66" height="17" x="29" y="289" rx="8.5" />
      <rect width="122" height="24" x="135" y="286" rx="4" />
      <rect width="66" height="17" x="29" y="345" rx="8.5" />
      <rect width="262" height="24" x="135" y="342" rx="4" />
      <rect width="66" height="17" x="29" y="401" rx="8.5" />
      <rect width="285" height="24" x="135" y="398" rx="4" />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M0 0h600v517H0z" />
      </clipPath>
    </defs>
  </svg>
);

const FlowEfficiencyLoader = () => {
  return (
    <div className="grid grid-cols-2 col-span-2 text-gray-200">
      <Loader />
      <Loader />
    </div>
  );
};

export default FlowEfficiencyLoader;
