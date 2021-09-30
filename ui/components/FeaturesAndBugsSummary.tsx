import prettyMilliseconds from 'pretty-ms';
import { sum } from 'rambda';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import type { AnalysedWorkItems, UIWorkItem, UIWorkItemType } from '../../shared/types';
import { num, oneYear } from '../helpers/utils';
import { getCLTTime, getLeadTime } from '../helpers/work-item-utils';
import { useModal } from './common/Modal';
import HorizontalBarGraph from './graphs/HorizontalBarGraph';
import ScatterLineGraph from './graphs/ScatterLineGraph';
import type { ProjectStatProps } from './ProjectStat';
import ProjectStat from './ProjectStat';
import ProjectStats from './ProjectStats';

const colors = [
  '#f44336',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#ff9800',
  '#795548'
];

const assignedColors = new Map();
const barColor = (env: string) => {
  if (!assignedColors.has(env)) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    assignedColors.set(env, color);
  }
  return assignedColors.get(env);
};

const computeBugLeakage = (
  bugLeakage: AnalysedWorkItems['bugLeakage'],
  workItemType: (workItem: UIWorkItem) => UIWorkItemType,
  showInModal: (x: { title: ReactNode; workItemIds: number[] }) => void
): ProjectStatProps[] => {
  if (!bugLeakage) return [];
  const aggregated = Object.values(bugLeakage).reduce<{ opened: number; closed: number}>((acc, item) => ({
    opened: acc.opened + item.opened.length,
    closed: acc.closed + item.closed.length
  }), {
    opened: 0,
    closed: 0
  });

  return [{
    topStats: [{ title: 'Bug leakage', value: num(aggregated.opened) }],
    workItemType,
    popupContents: () => (
      <HorizontalBarGraph
        width={400}
        graphData={Object.entries(bugLeakage)
          .map(([type, bugs]) => ({ label: type, value: bugs.opened.length, color: barColor(type) }))}
        onBarClick={({ label }) => {
          showInModal({
            title: (
              <>
                Bug leakage
                <span className="text-lg inline-block ml-2">{label}</span>
              </>
            ),
            workItemIds: bugLeakage[label].opened
          });
        }}
      />
    )
  }, {
    topStats: [{ title: 'Bugs closed', value: num(aggregated.closed) }],
    workItemType,
    popupContents: () => (
      <HorizontalBarGraph
        width={400}
        graphData={Object.entries(bugLeakage)
          .map(([type, bugs]) => ({ label: type, value: bugs.closed.length, color: barColor(type) }))}
        onBarClick={({ label }) => {
          showInModal({
            title: `Bugs closed: ${label}`,
            workItemIds: bugLeakage[label].closed
          });
        }}
      />
    )
  }];
};

const cltOrLtDefinition = (type: string, cltOrLt: string) => (
  cltOrLt === 'lt'
    ? `Average turnaround time for a ${type.toLowerCase()}. <br /> 
      Turnaround time is the time from when the ${type.toLowerCase()} <br /> 
      was created to when it was closed.`
    : `Average CLT for a ${type.toLowerCase()}. <br /> 
      CLT is the time from when the ${type.toLowerCase()} was dev done<br />
      to when it was deployed to productionn.`
);

const createTooltip = (
  label: string,
  xform: (x: UIWorkItem) => number,
  workItemType: (workItem: UIWorkItem) => UIWorkItemType
) => (
  (workItem: UIWorkItem) => `
  <div class="w-72">
    <div class="pl-3" style="text-indent: -1.15rem">
      <img src="${workItemType(workItem).icon}" width="14" height="14" class="inline-block -mt-1" />
      <strong>#${workItem.id}:</strong> ${workItem.title}
      <div class="pt-1">
        <strong>${label}:</strong> ${prettyMilliseconds(
    xform(workItem),
    xform(workItem) < oneYear ? { compact: true } : { unitCount: 2 }
  )}
      </div>
    </div>
  </div>
`.trim()
);

const getDuration = (start: string, end: string) => (
  new Date(end).getTime() - new Date(start).getTime()
);

const getDurationFor = (type: 'clt' | 'lt') => (workItem: UIWorkItem) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { start, end } = type === 'clt' ? workItem.clt! : workItem.leadTime!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return getDuration(start!, end!);
};

const getStats = (
  workItems: UIWorkItem[],
  workItemType: (workItem: UIWorkItem) => UIWorkItemType
) => {
  const wisByWitAndCltOrLt = workItems.reduce<Record<string, Record<'clt' | 'lt', UIWorkItem[]>>>(
    (acc, workItem) => {
      const wit = workItemType(workItem).name[0];
      acc[wit] = acc[wit] || {};
      if (workItem.leadTime.start && workItem.leadTime.end) {
        acc[wit].lt = acc[wit].lt || [];
        acc[wit].lt.push(workItem);
      }
      if (workItem.clt?.start && workItem.clt?.end) {
        acc[wit].clt = acc[wit].clt || [];
        acc[wit].clt.push(workItem);
      }
      return acc;
    },
    {}
  );

  return Object.entries(wisByWitAndCltOrLt)
    .reduce<ProjectStatProps[]>((acc, [wit, cltOrLt]) => {
      acc.push({
        topStats: Object.entries(cltOrLt).map(([cltOrLtType, workItems]) => ({
          title: `${wit} ${cltOrLtType === 'clt' ? 'CLT' : 'turnaround time'}`,
          value: workItems.length
            ? prettyMilliseconds(
              sum(workItems.map(getDurationFor(cltOrLtType as 'clt' | 'lt'))) / workItems.length,
              { compact: true }
            )
            : '-',
          tooltip: cltOrLtDefinition(wit, cltOrLtType)
        })),
        popupContents: () => (
          <>
            <div className="mr-10">
              <ScatterLineGraph
                height={400}
                linkForItem={workItem => workItem.url}
                graphData={[
                  {
                    label: 'Turnaround time',
                    data: wisByWitAndCltOrLt[wit].lt?.reduce<Record<string, UIWorkItem[]>>((acc, workItem) => {
                      acc[workItem.env || 'default-env'] = acc[workItem.env || 'default-env'] || [];
                      acc[workItem.env || 'default-env'].push(workItem);
                      return acc;
                    }, {}) || {},
                    yAxisPoint: getLeadTime,
                    tooltip: createTooltip('Turnaround time', getLeadTime, workItemType)
                  },
                  {
                    label: 'Change lead time',
                    data: wisByWitAndCltOrLt[wit].clt?.reduce<Record<string, UIWorkItem[]>>((acc, workItem) => {
                      acc[workItem.env || 'default-env'] = acc[workItem.env || 'default-env'] || [];
                      acc[workItem.env || 'default-env'].push(workItem);
                      return acc;
                    }, {}) || {},
                    yAxisPoint: getCLTTime,
                    tooltip: createTooltip('Change lead time', getCLTTime, workItemType)
                  }
                ]}
              />
            </div>
          </>
        )
      });
      return acc;
    }, []);
};

export type FeaturesAndBugsSummaryProps = {
  workItems: UIWorkItem[];
  bugLeakage: AnalysedWorkItems['bugLeakage'];
  workItemType: (workItem: UIWorkItem) => UIWorkItemType;
  workItemById: (id: number) => UIWorkItem;
};

const FeaturesAndBugsSummary: React.FC<FeaturesAndBugsSummaryProps> = ({
  workItems, bugLeakage, workItemType, workItemById
}) => {
  const [Modal, modalProps, open] = useModal();
  const [modalContents, setModalContents] = useState<{ title: ReactNode; workItemIds: number[] } | null>(null);

  const showInModal = useCallback((x: { title: ReactNode; workItemIds: number[] }) => {
    setModalContents(x);
    open();
  }, [open]);

  const computedStats = useMemo(() => [
    ...getStats(workItems, workItemType),
    ...computeBugLeakage(bugLeakage, workItemType, showInModal)
  ], [workItems, workItemType, bugLeakage, showInModal]);

  return (
    <div>
      <Modal {...modalProps} heading={modalContents?.title}>
        <ol className="ml-8">
          {modalContents?.workItemIds.map(id => (
            <li key={id} className="mb-2 list-decimal">
              <a
                href={workItemById(id).url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-blue-800 hover:underline items-start"
              >
                <img
                  src={workItemType(workItemById(id)).icon}
                  width="16"
                  height="16"
                  className="inline-block mr-2 mt-1"
                  alt={`Icon for ${workItemType(workItemById(id)).name[1]}`}
                />
                {workItemById(id).id}
                {': '}
                {workItemById(id).title}
              </a>
            </li>
          ))}
        </ol>
      </Modal>
      <ProjectStats>
        {computedStats.map(stat => (
          <ProjectStat
            key={stat.topStats[0].title}
            {...stat}
          />
        ))}
      </ProjectStats>

    </div>
  );
};

export default FeaturesAndBugsSummary;
