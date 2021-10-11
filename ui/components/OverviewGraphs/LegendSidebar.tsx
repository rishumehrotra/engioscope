import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { ProjectOverviewAnalysis } from '../../../shared/types';
import { modalHeading, useModal } from '../common/Modal';
import type { OrganizedWorkItems } from './helpers';
import { lineColor, noGroup } from './helpers';

type LegendSidebarProps = {
  heading: ReactNode;
  headlineStatValue: ReactNode;
  headlineStatUnits?: ReactNode;
  data: OrganizedWorkItems;
  projectAnalysis: ProjectOverviewAnalysis;
  childStat: (workItemIds: number[]) => ReactNode;
  modalContents: (x: {
    workItemIds: number[];
    witId: string;
    groupName: string;
  }) => ReactNode;
};

export const LegendSidebar: React.FC<LegendSidebarProps> = ({
  heading, headlineStatValue, headlineStatUnits, data,
  projectAnalysis, childStat, modalContents
}) => {
  const [Modal, modalProps, open] = useModal();
  const [dataForModal, setDataForModal] = useState<{
    workItemIds: number[];
    witId: string;
    groupName: string;
  } | null>(null);

  return (
    <div>
      <Modal
        {...modalProps}
        heading={dataForModal && modalHeading(
          projectAnalysis.overview.types[dataForModal.witId].name[1],
          dataForModal.groupName !== noGroup ? dataForModal.groupName : undefined
        )}
      >
        {dataForModal && modalContents(dataForModal)}
      </Modal>
      <div className="bg-gray-800 text-white p-4 mb-2 rounded-t-md">
        <h3 className="font-semibold pb-1">
          {heading}
        </h3>
        <div className="">
          <span className="text-2xl font-semibold">
            {headlineStatValue}
          </span>
          {' '}
          <span className="text-sm">
            {headlineStatUnits}
          </span>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2">
        {Object.entries(data).flatMap(([witId, groupedWorkItems]) => (
          Object.entries(groupedWorkItems).map(([groupName, workItemIds]) => (
            <button
              key={witId + groupName}
              className="p-2 shadow rounded-md block text-left"
              style={{
                borderLeft: `4px solid ${lineColor({ witId, groupName })}`
              }}
              onClick={() => {
                setDataForModal({ workItemIds, witId, groupName });
                open();
              }}
            >
              <h4
                className="text-sm flex items-center h-10 overflow-hidden px-5"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  textIndent: '-20px'
                }}
                data-tip={`${projectAnalysis.overview.types[witId].name[1]}${groupName === noGroup ? '' : `: ${groupName}`}`}
              >
                <img
                  className="inline-block mr-1"
                  alt={`Icon for ${projectAnalysis.overview.types[witId].name[0]}`}
                  src={projectAnalysis.overview.types[witId].icon}
                  width="16"
                />
                {projectAnalysis.overview.types[witId].name[1]}
                {groupName === noGroup ? '' : `: ${groupName}`}
              </h4>
              <div className="text-xl flex items-center pl-5 font-semibold">
                {childStat(workItemIds)}
              </div>
            </button>
          ))
        ))}
      </div>
    </div>
  );
};
