import React from 'react';

const SingleLoader = () => (
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
      <path
        fillRule="evenodd"
        d="M360.914 352.997h135.299c2.282 0 4.131 1.865 4.131 4.165 0 2.301-1.849 4.165-4.131 4.165H361.956l-124.021 32.062-122.014-10.305-87.54 35.218c-2.119.852-4.522-.189-5.367-2.325-.846-2.137.186-4.56 2.305-5.413l89.35-35.945 122.565 10.351 123.68-31.973ZM574.699 422.763H25.301v-1.041H574.7v1.041Z"
        clipRule="evenodd"
      />
    </g>
    <defs>
      <clipPath id="a">
        <path fill="#fff" d="M0 0h600v517H0z" />
      </clipPath>
    </defs>
  </svg>
);

const GraphAreaLoader = () => {
  return (
    <div className="grid grid-cols-2 col-span-2 text-gray-200">
      <SingleLoader />
      <SingleLoader />
    </div>
  );
};

export default GraphAreaLoader;
