import { pipe, prop } from 'rambda';
import type { ReactNode } from 'react';
import React, { useState, useMemo } from 'react';
import type {
  Overview, ProjectOverviewAnalysis, UIWorkItem, UIWorkItemType
} from '../../../shared/types';
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
import GraphCard from './GraphCard';

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
  sidebarModalContents: (line: WorkItemLine) => ReactNode;
  headlineStatUnits?: string;
  workItemInfoForModal?: (x: UIWorkItem) => ReactNode;
};

export const createGraphBlock = ({
  groupLabel, projectAnalysis, workItemType, workItemById
}: {
  groupLabel: (x: GroupLabel) => string;
  projectAnalysis: ProjectOverviewAnalysis;
  workItemType: (witId: string) => UIWorkItemType;
  workItemById: (id: number) => UIWorkItem;
}) => {
  const workItems = (dataLine: WorkItemLine) => dataLine.workItemPoints;
  const GraphBlock: React.FC<GraphBlockProps> = ({
    data, graphHeading, graphSubheading, pointToValue, crosshairBubbleTitle,
    formatValue, aggregateStats, sidebarHeading, sidebarHeadlineStat,
    showFlairForWorkItemInModal, sidebarItemStat, headlineStatUnits,
    workItemInfoForModal, daySplitter, sidebarModalContents
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
      <>
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
                        workItem={workItemById(workItemId)}
                        workItemType={workItemType(witId)}
                        flair={showFlairForWorkItemInModal && aggregateAndFormat([workItemId])}
                      />
                      {workItemInfoForModal?.(workItemById(workItemId))}
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
        <GraphCard
          title={graphHeading}
          subtitle={graphSubheading}
          left={(
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
                  workItemType={workItemType}
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
          )}
          right={(
            <LegendSidebar
              heading={sidebarHeading}
              headlineStatValue={sidebarHeadlineStat(dataByDay)}
              data={data}
              workItemType={workItemType}
              headlineStatUnits={headlineStatUnits}
              childStat={sidebarItemStat || aggregateAndFormat}
              modalContents={({ workItemIds }) => {
                const matchingLine = dataByDay
                  .find(line => line.workItemPoints
                    .flatMap(prop('workItemIds'))
                    .some(id => workItemIds.includes(id)));

                if (!matchingLine) return 'Nothing to see here';

                return sidebarModalContents(matchingLine);
              }}
            />
          )}
        />
      </>
    );
  };
  return GraphBlock;
};
