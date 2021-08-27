import React from 'react';

const LoadMore: React.FC<{hiddenItemsCount: number; loadMore: () => void}> = ({ hiddenItemsCount, loadMore }) => (
  <div className="flex justify-between items-center my-16">
    <div className="zigzag mx-4" />
    <div className="border rounded-sm p-4">
      <div className="text-sm">{`${hiddenItemsCount} repos hidden`}</div>
      <button
        onClick={loadMore}
        className="w-32 text-base link-text"
      >
        Show more...
      </button>
    </div>
    <div className="zigzag mx-4" />
  </div>
);

export default LoadMore;
