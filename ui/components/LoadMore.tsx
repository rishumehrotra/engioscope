import React from 'react';
import usePageName from '../hooks/use-page-name';
import { useTabs } from '../hooks/use-tabs';

const LoadMore: React.FC<{hiddenItemsCount: number; loadMore: () => void}> = ({ hiddenItemsCount, loadMore }) => {
  const [selectedTab] = useTabs();
  const pageName = usePageName();

  if (hiddenItemsCount <= 0) return null;

  return (
    <div className="flex justify-between items-center my-16">
      <div className="zigzag mx-4" />
      <div className="border rounded-sm p-4 text-center">
        <div className="text-sm">{`${hiddenItemsCount} ${pageName(selectedTab, hiddenItemsCount).toLowerCase()} hidden`}</div>
        <button
          onClick={loadMore}
          className="w-32 text-base link-text"
        >
          Show more
        </button>
      </div>
      <div className="zigzag mx-4" />
    </div>
  );
};

export default LoadMore;
