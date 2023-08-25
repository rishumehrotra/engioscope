import React from 'react';

const SingleLoader = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="600"
    height="517"
    viewBox="14.5 0 600 517"
    fill="none"
  >
    <rect width="114" height="16" x="38.5" y="105" fill="currentColor" rx="8" />
    <rect width="114" height="16" x="38.5" y="458" fill="currentColor" rx="8" />
    <rect width="114" height="16" x="168.5" y="105" fill="currentColor" rx="8" />
    <rect width="114" height="16" x="14.5" y="10" fill="currentColor" rx="8" />
    <rect width="571" height="16" x="14.5" y="41" fill="currentColor" rx="8" />
    <rect width="90" height="33" x="38.5" y="137" fill="currentColor" rx="16.5" />
    <rect width="90" height="33" x="168.5" y="137" fill="currentColor" rx="16.5" />
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10 81a8.5 8.5 0 0 1 8.5-8.5h564A8.5 8.5 0 0 1 591 81v417a8.5 8.5 0 0 1-8.5 8.5h-564A8.5 8.5 0 0 1 10 498V81Zm8.5-7.5A7.5 7.5 0 0 0 11 81v417a7.5 7.5 0 0 0 7.5 7.5h564a7.5 7.5 0 0 0 7.5-7.5V81a7.5 7.5 0 0 0-7.5-7.5h-564Z"
      clipRule="evenodd"
    />
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M359.485 349H490.5a4 4 0 0 1 0 8H360.494L240.4 387.79l-118.15-9.896-84.768 33.821a4 4 0 1 1-2.964-7.43l86.52-34.521 118.684 9.942L359.485 349ZM566.5 416h-532v-1h532v1Z"
      clipRule="evenodd"
    />
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
