import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';

type InfiniteScrollListProps<T> = {
  items: T[];
  itemRenderer: (item: T, index: number) => React.ReactNode;
  itemKey: (item: T) => React.Key;
  onRenderItems?: (items: T[]) => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const InfiniteScrollList = <T extends {}>({
  items,
  itemRenderer,
  itemKey,
  onRenderItems,
}: InfiniteScrollListProps<T>) => {
  const [slicedItems, setSlicedItems] = useState<T[]>([]);
  const lastTriggerTime = useRef(Date.now());
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '300px',
  });

  useEffect(() => {
    setSlicedItems(items.slice(0, 10));
  }, [items]);

  useEffect(() => {
    onRenderItems?.(slicedItems);
  }, [onRenderItems, slicedItems]);

  useEffect(() => {
    if (inView && Date.now() - lastTriggerTime.current > 500) {
      setSlicedItems(items.slice(0, slicedItems.length + 10));
      lastTriggerTime.current = Date.now();
    }
  }, [inView, items, slicedItems, slicedItems.length]);

  return (
    <ul>
      {slicedItems.map((item, index) => (
        <li key={itemKey(item)} {...(index === slicedItems.length - 1 ? { ref } : {})}>
          {itemRenderer(item, index)}
        </li>
      ))}
    </ul>
  );
};

export default InfiniteScrollList;
