import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { useInView } from 'react-intersection-observer';
import useDownloadLinkProps from '../../../hooks/use-download-link-props';
import { sidebarWidth } from './LegendSidebar';

type GraphCardProps = {
  title: string;
  subtitle: string;
  hasData: boolean;
  left: ReactNode;
  right: ReactNode;
  renderLazily?: boolean;
  csvData?: (string | number)[][];
};

const titleToUrlFragment = (title: string) => (
  title.toLowerCase().replace(/\s/g, '-')
);

const convertToCSV = (data: (string | number)[][]) => (
  data.map(
    row => row
      .map(cell => (
        typeof cell === 'string'
          ? `"${cell.replace(/"/g, '""')}"`
          : cell
      ))
      .join(',')
  ).join('\n')
);

const GraphCard: React.FC<GraphCardProps> = ({
  title, subtitle, left, right, hasData, renderLazily = true, csvData
}) => {
  const csv = useMemo(() => (csvData ? convertToCSV(csvData) : null), [csvData]);
  const downloadLinkAttributes = useDownloadLinkProps(csv || '', 'text/plain', `${title} - ${new Date().toISOString().split('T')[0]}.csv`);

  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: `-${document.querySelector('#sticky-block')?.getBoundingClientRect().height || 0}px`
  });

  const mustRender = useMemo(
    () => !renderLazily || inView || window.location.hash === `#${titleToUrlFragment(title)}`,
    [inView, renderLazily, title]
  );

  return (
    <div
      className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow"
      style={{ pageBreakInside: 'avoid' }}
      ref={ref}
      id={titleToUrlFragment(title)}
    >
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-semibold group">
            {title}
            {' '}
            <a
              href={`#${titleToUrlFragment(title)}`}
              className="opacity-0 group-hover:opacity-100 text-gray-400"
              title="Link to this graph"
            >
              #
            </a>
          </h1>
          <p className="text-base text-gray-600 mb-4">
            {subtitle}
          </p>
        </div>
        <div className="pt-2">
          {csv && (
            <a
              {...downloadLinkAttributes}
              className="opacity-60 text-xs hover:opacity-100 hover:text-blue-700 hover:underline uppercase"
            >
              CSV
            </a>
          )}
        </div>
      </div>

      {hasData
        ? mustRender && (
          <div className="grid gap-8 grid-flow-col">
            <div
              className="flex gap-6 justify-evenly pt-2"
              style={{ gridTemplateColumns: `1fr ${sidebarWidth}` }}
            >
              <div className="w-full">{left}</div>
              <div className="self-start">{right}</div>
            </div>
          </div>
        )
        : (
          <p className="text-gray-600 italic text-sm">
            Couldn't find any data.
          </p>
        )}
    </div>
  );
};

export default GraphCard;
