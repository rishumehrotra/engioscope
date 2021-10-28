import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { UIWorkItemType } from '../../../shared/types';
import { modalHeading, useModal } from '../common/Modal';
import type { GroupLabel, OrganizedWorkItems } from './helpers';
import { lineColor, noGroup } from './helpers';

export const sidebarWidth = '317px';

export type LegendSidebarProps = {
  heading: ReactNode;
  headlineStats?: (data: OrganizedWorkItems) => {
    heading: string;
    value: string | number;
    unit?: string;
  }[];
  data: OrganizedWorkItems;
  workItemType: (wit: string) => UIWorkItemType;
  childStat: (workItemIds: number[]) => ReactNode;
  modalContents: (x: {
    workItemIds: number[];
    witId: string;
    groupName: string;
  }) => ReactNode;
  isCheckboxChecked?: ({ witId, groupName }: GroupLabel) => boolean;
  onCheckboxChange?: ({ witId, groupName }: GroupLabel) => void;
};

export const LegendSidebar: React.FC<LegendSidebarProps> = ({
  heading, data, childStat, modalContents, workItemType, headlineStats,
  isCheckboxChecked, onCheckboxChange
}) => {
  const [Modal, modalProps, open] = useModal();
  const [dataForModal, setDataForModal] = useState<{
    workItemIds: number[];
    witId: string;
    groupName: string;
  } | null>(null);

  return (
    <div style={{ width: sidebarWidth }} className="justify-self-end">
      <Modal
        {...modalProps}
        heading={dataForModal && modalHeading(
          heading,
          workItemType(dataForModal.witId).name[1]
          + (dataForModal.groupName !== noGroup ? ` / ${dataForModal.groupName}` : '')
        )}
      >
        {dataForModal && modalContents(dataForModal)}
      </Modal>
      <div className="bg-gray-800 text-white p-4 mb-2 rounded-t-md grid grid-cols-2 gap-4">
        {headlineStats?.(data).map(({ heading, value, unit }) => (
          <div key={heading}>
            <h3 className="font-semibold pb-1">
              {heading}
            </h3>
            <div className="">
              <span className="text-2xl font-semibold">
                {value}
              </span>
              {' '}
              <span className="text-sm">
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 grid-cols-2">
        {Object.entries(data).flatMap(([witId, groupedWorkItems]) => (
          Object.entries(groupedWorkItems).map(([groupName, workItemIds]) => (
            <div className="relative" key={witId + groupName}>
              {isCheckboxChecked && (
                <input
                  type="checkbox"
                  className="absolute right-2 top-2 opacity-40"
                  checked={isCheckboxChecked({ witId, groupName })}
                  onChange={e => {
                    if (!onCheckboxChange) return;
                    onCheckboxChange({ witId, groupName });
                    e.stopPropagation();
                  }}
                />
              )}

              <button
                className="p-2 shadow rounded-md block text-left w-full"
                style={{
                  borderLeft: `5px solid ${lineColor({ witId, groupName })}`
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
                  data-tip={`${workItemType(witId).name[1]}${groupName === noGroup ? '' : `: ${groupName}`}`}
                >
                  <img
                    className="inline-block mr-1"
                    alt={`Icon for ${workItemType(witId).name[0]}`}
                    src={workItemType(witId).icon}
                    width="16"
                  />
                  {groupName === noGroup
                    ? workItemType(witId).name[1]
                    : groupName}
                </h4>
                <div className="text-xl flex items-center pl-5 font-semibold">
                  {childStat(workItemIds)}
                </div>
              </button>
            </div>
          ))
        ))}
      </div>
    </div>
  );
};
