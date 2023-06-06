import type { ReactNode } from 'react';
import React, { useEffect, useRef } from 'react';

type AnimateHeightProps = {
  children: ReactNode;
  collapse?: boolean;
  onCollapsed?: () => void;
};

const AnimateHeight = ({ children, collapse, onCollapsed }: AnimateHeightProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.classList.add('grid-rows-[1fr]');
    }, 1);
  }, []);

  useEffect(() => {
    if (collapse) {
      ref.current?.classList.remove('grid-rows-[1fr]');

      ref.current?.addEventListener('transitionend', () => onCollapsed?.(), {
        once: true,
      });
    }
  }, [collapse, onCollapsed]);

  return (
    <div
      ref={ref}
      className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200"
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
};

export default AnimateHeight;
