import React, { useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

type InfiniteScrollListProps<T> = {
  items: T[];
  loadNextPage: () => void;
  itemComponent: React.FC<{ item: T; index: number }>;
  itemKey: (item: T) => string;
};

const InfiniteScrollList2 = <T,>({
  items,
  itemKey,
  loadNextPage,
  itemComponent: Item,
}: InfiniteScrollListProps<T>) => {
  const lastTriggerTime = useRef(Date.now());
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && Date.now() - lastTriggerTime.current > 500) {
      loadNextPage();
      lastTriggerTime.current = Date.now();
    }
  }, [inView, loadNextPage]);

  return (
    <ul>
      {items.map((item, index) => (
        <li key={itemKey(item)} {...(index === items.length - 1 ? { ref } : {})}>
          <Item {...{ item, index }} />
        </li>
      ))}
    </ul>
  );
};

export default InfiniteScrollList2;
