import { pipe } from 'rambda';
import type { ReactNode } from 'react';
import React, { useState, useMemo } from 'react';
import type { ProjectOverviewAnalysis, UIWorkItem } from '../../../shared/types';
import { contrastColour, shortDate } from '../../helpers/utils';
import { modalHeading, useModal } from '../common/Modal';
import LineGraph from '../graphs/LineGraph';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import { lineColor } from './helpers';
import type { GroupLabel } from './helpers';
import { getMatchingAtIndex } from './day-wise-line-graph-helpers';
import type { MatchedDay, WorkItemLine, WorkItemPoint } from './day-wise-line-graph-helpers';
import { CrosshairBubble } from './CrosshairBubble';
import { LegendSidebar } from './LegendSidebar';

type GraphBlockProps = {
  data: WorkItemLine[];
  graphHeading: string;
  graphSubheading: string;
  pointToValue: (point: WorkItemPoint) => number;
  crosshairBubbleTitle: (x: MatchedDay[]) => ReactNode;
  aggregateStats: (x: number[]) => number;
  sidebarHeading: string;
  sidebarHeadlineStat: (x: WorkItemLine[]) => ReactNode;
  sidebarItemStat?: (x: WorkItemLine) => ReactNode;
  showFlairForWorkItemInModal?: boolean;
  formatValue: (x: number) => string;
  headlineStatUnits?: string;
  workItemInfoForModal?: (x: UIWorkItem) => ReactNode;
};

export const createGraphBlock = ({ groupLabel, projectAnalysis }: {
  groupLabel: (x: GroupLabel) => string;
  projectAnalysis: ProjectOverviewAnalysis;
}) => {
  const workItems = (dataLine: WorkItemLine) => dataLine.workItems;
  const GraphBlock: React.FC<GraphBlockProps> = ({
    data, graphHeading, graphSubheading, pointToValue, crosshairBubbleTitle,
    formatValue, aggregateStats, sidebarHeading, sidebarHeadlineStat,
    showFlairForWorkItemInModal, sidebarItemStat, headlineStatUnits, workItemInfoForModal
  }) => {
    const [dayIndexInModal, setDayIndexInModal] = useState<number | null>(null);
    const [Modal, modalProps, openModal] = useModal();
    const aggregateAndFormat = useMemo(
      () => pipe(aggregateStats, formatValue),
      [aggregateStats, formatValue]
    );

    const matchingDateForModal = useMemo(() => (
      dayIndexInModal ? getMatchingAtIndex(data, dayIndexInModal) : null
    ), [data, dayIndexInModal]);

    return (
      <div className="bg-white border-l-4 p-6 mb-4 rounded-lg shadow">
        <Modal
          {...modalProps}
          heading={modalHeading(
            graphHeading,
            matchingDateForModal?.[0] && shortDate(matchingDateForModal[0].date)
          )}
        >
          {matchingDateForModal?.length
            ? matchingDateForModal?.map(({ witId, groupName, workItemIds }) => (
              <div
                key={witId + groupName}
                className="mb-8"
              >
                <h3 className="font-semibold text-lg">
                  {groupLabel({ witId, groupName })}
                  <span
                    className="text-base inline-block ml-2 px-3 rounded-full"
                    style={{
                      color: contrastColour(lineColor({ witId, groupName })),
                      backgroundColor: lineColor({ witId, groupName })
                    }}
                  >
                    {aggregateAndFormat(workItemIds)}
                  </span>
                </h3>
                <ul>
                  {workItemIds.map(workItemId => (
                    <li key={workItemId} className="py-2">
                      <WorkItemLinkForModal
                        workItem={projectAnalysis.overview.byId[workItemId]}
                        workItemType={projectAnalysis.overview.types[witId]}
                        flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                      />
                      {workItemInfoForModal?.(projectAnalysis.overview.byId[workItemId])}
                    </li>
                  ))}
                </ul>
              </div>
            ))
            : (
              <div className="text-gray-600 italic">
                Nothing to see here
              </div>
            )}
        </Modal>
        <h1 className="text-2xl font-semibold">
          {graphHeading}
        </h1>
        <p className="text-base text-gray-600 mb-4">
          {graphSubheading}
        </p>
        <div className="grid gap-8 grid-flow-col">
          {!data.length ? (
            <div className="text-gray-500 italic">
              Couldn't find any closed workitems in the last month.
            </div>
          ) : (
            <>
              <LineGraph<WorkItemLine, WorkItemPoint>
                lines={data}
                points={workItems}
                pointToValue={pointToValue}
                yAxisLabel={formatValue}
                lineLabel={groupLabel}
                xAxisLabel={x => shortDate(x.date)}
                lineColor={lineColor}
                crosshairBubble={(pointIndex: number) => (
                  <CrosshairBubble
                    data={data}
                    index={pointIndex}
                    projectAnalysis={projectAnalysis}
                    groupLabel={groupLabel}
                    title={crosshairBubbleTitle}
                    itemStat={aggregateAndFormat}
                  />
                )}
                onClick={(...args) => {
                  setDayIndexInModal(args[0]);
                  openModal();
                }}
              />
              <LegendSidebar
                heading={sidebarHeading}
                headlineStatValue={sidebarHeadlineStat(data)}
                data={data}
                projectAnalysis={projectAnalysis}
                headlineStatUnits={headlineStatUnits}
                childStat={sidebarItemStat
                  || (({ workItems }) => aggregateAndFormat(workItems.reduce<number[]>((a, wi) => a.concat(wi.workItemIds), [])))}
                modalContents={line => (
                  <ul>
                    {line.workItems.map(({ date, workItemIds }) => (
                      workItemIds.length
                        ? (
                          <li key={date.toISOString()}>
                            <div className="font-semibold text-lg mt-4 mb-1">
                              {shortDate(date)}
                              <span
                                style={{
                                  color: contrastColour(lineColor({ witId: line.witId, groupName: line.groupName })),
                                  background: lineColor({ witId: line.witId, groupName: line.groupName })
                                }}
                                className="inline-block px-2 ml-2 rounded-full text-base"
                              >
                                {aggregateAndFormat(workItemIds)}
                              </span>
                            </div>
                            <ul>
                              {workItemIds.map(workItemId => (
                                <li key={workItemId} className="py-2">
                                  <WorkItemLinkForModal
                                    workItem={projectAnalysis.overview.byId[workItemId]}
                                    workItemType={projectAnalysis.overview.types[line.witId]}
                                    flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                                  />
                                  {workItemInfoForModal?.(projectAnalysis.overview.byId[workItemId])}
                                </li>
                              ))}
                            </ul>
                          </li>
                        )
                        : null
                    ))}
                  </ul>
                )}
              />
            </>
          )}
        </div>
      </div>
    );
  };
  return GraphBlock;
};
