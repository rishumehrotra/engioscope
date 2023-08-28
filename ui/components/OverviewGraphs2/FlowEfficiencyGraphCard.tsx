import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { twJoin } from 'tailwind-merge';
import { not } from 'rambda';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { lineColor } from './utils.js';
import { minPluralise, num } from '../../helpers/utils.js';
import { useDrawer } from '../common/Drawer.jsx';
import { DownChevron, UpChevron } from '../common/Icons.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import type { FlowEfficiencyWorkItems } from '../../../backend/models/workitems2';
import { FlowEfficiencyHelpText } from './FlowEfficiencyHelpText.jsx';
import { CycleTimeDrawer } from './Drawers.jsx';

type FlowEfficiencyGraphCardProps = {
  data: FlowEfficiencyWorkItems[];
  index: number;
  workItemConfig?: SingleWorkItemConfig;
};

const FlowEfficiencyGraphCard = ({
  data,
  index,
  workItemConfig,
}: FlowEfficiencyGraphCardProps) => {
  const collapsedCount = 10;
  const [isExpanded, setIsExpanded] = useState(false);
  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [additionalDrawerProps, setAdditionalDrawerProps] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({
    heading: 'Loading...',
    children: 'Loading...',
  });

  const [groups, setGroups] = useState<{ groupName: string; count: number }[]>([]);
  const [workItemType, setWorkItemType] = useState<string>('');

  useEffect(() => {
    setWorkItemType(workItemConfig?.name?.[1] || '');
  }, [workItemConfig]);

  useEffect(() => {
    setGroups(data?.map(g => ({ groupName: g.groupName, count: g.count })) || []);
  }, [data]);

  return (
    <>
      <div className="contents" style={{ gridArea: `graph${index}` }}>
        <Drawer {...drawerProps} {...additionalDrawerProps} />
        <div
          className={twJoin(
            'rounded-xl border border-theme-seperator p-4 mt-4 mb-4',
            'bg-theme-page-content group/block'
          )}
          style={{
            boxShadow: 'rgba(30, 41, 59, 0.05) 0px 4px 8px',
          }}
        >
          <div className="flex justify-between">
            <div className={twJoin('bg-theme-page-content group/block')}>
              <div className="grid grid-flow-col justify-between items-end">
                <div className="text-lg font-bold flex items-center gap-2">
                  {num(groups.reduce((sum, group) => sum + group.count, 0))}{' '}
                  {minPluralise(
                    groups.reduce((sum, group) => sum + group.count, 0),
                    ...(workItemConfig?.name || ['', ''])
                  ).toLowerCase()}
                </div>
              </div>
            </div>
          </div>
          {data ? (
            <>
              <ul>
                {data.slice(0, isExpanded ? undefined : collapsedCount).map(group => (
                  <li key={group.groupName} className="p2">
                    <button
                      className="grid gap-4 pl-3 my-3 w-full rounded-lg items-center hover:bg-gray-100 cursor-pointer"
                      style={{ gridTemplateColumns: '20% 1fr 85px' }}
                      onClick={() => {
                        setAdditionalDrawerProps({
                          heading: `${workItemType} - ${num(
                            groups.reduce((sum, group) => sum + group.count, 0)
                          )}`,
                          children: (
                            <CycleTimeDrawer
                              selectedTab={group.groupName}
                              workItemConfig={workItemConfig}
                            />
                          ),
                        });
                        openDrawer();
                      }}
                    >
                      <div className="flex items-center justify-end">
                        <span className="truncate">{group.groupName}</span>
                      </div>
                      <div className="bg-gray-100 rounded-md overflow-hidden">
                        <div
                          className="rounded-md"
                          style={{
                            width: `${divide(group.workCentersDuration, group.cycleTime)
                              .map(toPercentage)
                              .getOr(`0%`)}`,
                            backgroundColor: lineColor(group.groupName),
                            height: '30px',
                          }}
                        />
                      </div>
                      <span className="justify-self-start">
                        <b>
                          {divide(group.workCentersDuration, group.cycleTime)
                            .map(toPercentage)
                            .getOr('-')}
                        </b>
                        <span className="text-sm text-gray-500">{` (${num(
                          group.count
                        )})`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {groups.length > collapsedCount && (
                <div className="flex justify-end">
                  <button
                    className="text-blue-700 text-sm flex items-center hover:text-blue-900 hover:underline"
                    onClick={() => setIsExpanded(not)}
                  >
                    {isExpanded ? (
                      <UpChevron className="w-4 mr-1" />
                    ) : (
                      <DownChevron className="w-4 mr-1" />
                    )}
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-600 italic text-sm">Couldn't find any data.</p>
          )}
        </div>
      </div>
      <FlowEfficiencyHelpText workItemConfig={workItemConfig} index={index} />
    </>
  );
};

export default FlowEfficiencyGraphCard;
