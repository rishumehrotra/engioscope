import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import usePopover from '../hooks/use-popover.js';
import { DownChevron, ExternalLink } from './common/Icons.js';
import { useModalHelper } from './OverviewGraphs/helpers/modal-helpers.js';

type Stat = {
  title: string;
  value: ReactNode;
  tooltip?: string;
};

export type ProjectStatProps = {
  topStats: Stat[];
  childStats?: Stat[];
  onClick?:
    | {
        open: 'popup';
        direction?: 'left' | 'right';
        contents: (x: { topStats: Stat[]; childStats?: Stat[] }) => ReactNode;
      }
    | {
        open: 'modal';
        heading: string;
        subheading?: string;
        body: ReactNode;
      };
};

const ProjectStat: React.FC<ProjectStatProps> = ({ topStats, childStats, onClick }) => {
  const [ref, isPopupOpen, setIsPopupOpen] = usePopover();
  const [Modal, modalProps, openModal] = useModalHelper();

  const onButtonClick = useCallback(() => {
    if (!onClick) return;
    if (onClick.open === 'popup') setIsPopupOpen(!isPopupOpen);
    if (onClick.open === 'modal') {
      openModal({
        heading: onClick.heading,
        subheading: onClick.subheading,
        body: onClick.body,
      });
    }
  }, [onClick, setIsPopupOpen, isPopupOpen, openModal]);

  return (
    <>
      <button
        className={`p-4 border border-gray-200 bg-white shadow-sm ml-1 rounded-lg flex text-left min-w-max
          ${isPopupOpen ? 'border-gray-300' : ''}
          ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={onButtonClick}
        ref={ref}
      >
        {topStats
          ? topStats.map(({ title, value, tooltip }) => (
              <div
                key={`${title}-${value}`}
                data-tooltip-id="react-tooltip"
                data-tooltip-html={tooltip}
                className={`mx-2 flex flex-col justify-end ${childStats ? 'mr-4' : ''}`}
              >
                <h3 className="text-xs font-medium">{title}</h3>
                <div className="font-bold text-2xl">
                  {value}
                  {onClick?.open === 'modal' ? (
                    <span className="ml-2 inline-block text-blue-500">
                      <ExternalLink className="w-5" />
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          : null}

        {childStats
          ? childStats.map(({ title, value, tooltip }) => (
              <div
                data-tooltip-id="react-tooltip"
                data-tooltip-html={tooltip}
                key={`${title}-${value}`}
                className="mx-2 flex flex-col h-full justify-end"
              >
                <h3 className="text-xs">{title}</h3>
                <div className="font-bold leading-7">{value}</div>
              </div>
            ))
          : null}

        {onClick?.open === 'popup' ? (
          <div
            className={`border-l self-center ml-3 px-1 py-0.5 rounded ${
              isPopupOpen ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-800'
            }`}
          >
            <DownChevron className="w-4" />
          </div>
        ) : null}
      </button>
      {onClick?.open === 'popup' && isPopupOpen && (
        <div
          style={{ top: '90px' }}
          className={`flex absolute ${
            (onClick.direction || 'left') === 'left' ? 'left-1' : 'right-0'
          } z-20 bg-white px-5 py-5 rounded-lg mb-3 shadow-lg border border-gray-200`}
        >
          {onClick.contents({ topStats, childStats })}
        </div>
      )}
      {onClick?.open === 'modal' && <Modal {...modalProps} />}
    </>
  );
};

export default ProjectStat;
