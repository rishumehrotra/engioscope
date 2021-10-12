import { pipe } from 'rambda';
import type { ReactNode } from 'react';
import React, { useState, useMemo } from 'react';
import type { Overview, ProjectOverviewAnalysis, UIWorkItem } from '../../../shared/types';
import { contrastColour, shortDate } from '../../helpers/utils';
import { modalHeading, useModal } from '../common/Modal';
import LineGraph from '../graphs/LineGraph';
import { WorkItemLinkForModal } from '../WorkItemLinkForModalProps';
import { lineColor } from './helpers';
import type { GroupLabel, OrganizedWorkItems } from './helpers';
import { getMatchingAtIndex, splitByDateForLineGraph } from './day-wise-line-graph-helpers';
import type { WorkItemLine, WorkItemPoint } from './day-wise-line-graph-helpers';
import { CrosshairBubble } from './CrosshairBubble';
import { LegendSidebar } from './LegendSidebar';

type GraphBlockProps = {
  data: OrganizedWorkItems;
  daySplitter: (workItemId: number, date: Date, overview: Overview) => boolean;
  graphHeading: string;
  graphSubheading: string;
  pointToValue: (point: WorkItemPoint) => number;
  crosshairBubbleTitle: ReactNode;
  aggregateStats: (x: number[]) => number;
  showFlairForWorkItemInModal?: boolean;
  formatValue: (x: number) => string;
  sidebarHeading: string;
  sidebarHeadlineStat: (workItemIds: WorkItemLine[]) => ReactNode;
  sidebarItemStat?: (workItemIds: number[]) => ReactNode;
  headlineStatUnits?: string;
  workItemInfoForModal?: (x: UIWorkItem) => ReactNode;
};

export const createGraphBlock = ({ groupLabel, projectAnalysis }: {
  groupLabel: (x: GroupLabel) => string;
  projectAnalysis: ProjectOverviewAnalysis;
}) => {
  const workItems = (dataLine: WorkItemLine) => dataLine.workItemPoints;
  const GraphBlock: React.FC<GraphBlockProps> = ({
    data, graphHeading, graphSubheading, pointToValue, crosshairBubbleTitle,
    formatValue, aggregateStats, sidebarHeading, sidebarHeadlineStat,
    showFlairForWorkItemInModal, sidebarItemStat, headlineStatUnits,
    workItemInfoForModal, daySplitter
  }) => {
    const dataByDay = useMemo(() => splitByDateForLineGraph(
      projectAnalysis, data, daySplitter
    ), [data, daySplitter]);
    const [dayIndexInModal, setDayIndexInModal] = useState<number | null>(null);
    const [Modal, modalProps, openModal] = useModal();
    const aggregateAndFormat = useMemo(
      () => pipe(aggregateStats, formatValue),
      [aggregateStats, formatValue]
    );

    const matchingDateForModal = useMemo(() => (
      dayIndexInModal ? getMatchingAtIndex(dataByDay, dayIndexInModal) : null
    ), [dataByDay, dayIndexInModal]);

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
          {!dataByDay.length ? (
            <div className="text-gray-500 italic">
              Couldn't find any closed workitems in the last month.
            </div>
          ) : (
            <>
              <LineGraph<WorkItemLine, WorkItemPoint>
                lines={dataByDay}
                points={workItems}
                pointToValue={pointToValue}
                yAxisLabel={formatValue}
                lineLabel={groupLabel}
                xAxisLabel={x => shortDate(x.date)}
                lineColor={lineColor}
                crosshairBubble={(pointIndex: number) => (
                  <CrosshairBubble
                    data={dataByDay}
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
                headlineStatValue={sidebarHeadlineStat(dataByDay)}
                data={data}
                projectAnalysis={projectAnalysis}
                headlineStatUnits={headlineStatUnits}
                childStat={sidebarItemStat || aggregateAndFormat}
                modalContents={({ workItemIds }) => (
                  <ul>
                    {workItemIds.length
                      ? (
                        <ul>
                          {workItemIds.map(workItemId => (
                            <li key={workItemId} className="py-2">
                              <WorkItemLinkForModal
                                workItem={projectAnalysis.overview.byId[workItemId]}
                                workItemType={projectAnalysis.overview.types[projectAnalysis.overview.byId[workItemId].typeId]}
                                flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                              />
                              {workItemInfoForModal?.(projectAnalysis.overview.byId[workItemId])}
                            </li>
                          ))}
                        </ul>
                      )
                      : null}
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
