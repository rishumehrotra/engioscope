import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { ChevronRight } from 'react-feather';
import { twJoin } from 'tailwind-merge';
import AnimateHeight from '../common/AnimateHeight.jsx';

type PageSectionProps = {
  heading: string;
  subheading: string;
  children?: ReactNode;
  isOpen?: boolean;
};

const PageSection = ({
  heading,
  subheading,
  children,
  isOpen = false,
}: PageSectionProps) => {
  const [state, setState] = useState<'open' | 'closing' | 'closed'>(
    isOpen ? 'open' : 'closed'
  );

  return (
    <section className="mb-8">
      <button
        className={twJoin(
          'grid grid-cols-[2em_1fr] w-full',
          'text-left hover:bg-theme-page-content rounded-md py-2 px-1'
        )}
        onClick={() => setState(x => (x === 'open' ? 'closing' : 'open'))}
      >
        <div
          className={twJoin(
            'mt-1 text-theme-icon transition-transform',
            state === 'open' && 'rotate-90 translate-y-1.5 -translate-x-1'
          )}
        >
          <ChevronRight />
        </div>
        <div>
          <h2 className="text-2xl font-medium mb-1">{heading}</h2>
          <p className="text-theme-helptext">{subheading}</p>
        </div>
      </button>
      <div className="grid grid-cols-[2em_1fr]">
        <span />
        {state === 'closed' ? null : (
          <AnimateHeight
            collapse={state === 'closing'}
            onCollapsed={() => setState('closed')}
          >
            {children}
          </AnimateHeight>
        )}
      </div>
    </section>
  );
};

export default PageSection;
