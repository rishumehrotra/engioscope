import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { ChevronRight } from 'react-feather';
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
    <section className="grid grid-cols-[2em_1fr] mb-10">
      <div>
        <button
          className="mt-1 text-theme-icon"
          onClick={() => setState(x => (x === 'open' ? 'closing' : 'open'))}
        >
          <ChevronRight />
        </button>
      </div>
      <div>
        <button
          className="w-full text-left"
          onClick={() => setState(x => (x === 'open' ? 'closing' : 'open'))}
        >
          <h2 className="text-2xl font-medium mb-1">{heading}</h2>
          <p className="text-theme-helptext">{subheading}</p>
        </button>
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
