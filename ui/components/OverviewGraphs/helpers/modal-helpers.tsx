import { prop } from 'rambda';
import type { ReactNode } from 'react';
import React, {
  useMemo, useCallback, useState
} from 'react';
import ReactTooltip from 'react-tooltip';
import { asc, byDate } from 'sort-lib';
import type { UIWorkItem, UIWorkItemType } from '../../../../shared/types.js';
import { divide } from '../../../../shared/utils.js';
import { trpc } from '../../../helpers/trpc.js';
import {
  contrastColour, prettyMS, priorityBasedColor, shortDate
} from '../../../helpers/utils.js';
import { useCollectionAndProject } from '../../../hooks/query-hooks.js';
import { modalHeading, useModal } from '../../common/Modal.js';
import Loading from '../../Loading.jsx';
import type { WorkItemAccessors } from './helpers.js';
import { lineColor, noGroup } from './helpers.js';

export type ModalArgs = {
  heading: ReactNode;
  subheading: ReactNode;
  body: ReactNode;
};

export const useModalHelper = () => {
  const [Modal, modalProps, open] = useModal();
  const [modalState, setModalState] = useState<ModalArgs>(
    { heading: null, subheading: null, body: null }
  );

  const fullModalProps = useMemo(() => ({
    ...modalProps,
    heading: modalHeading(modalState.heading, modalState.subheading),
    children: modalState.body
  }), [modalProps, modalState.body, modalState.heading, modalState.subheading]);

  const openModal = useCallback((x: ModalArgs) => {
    setModalState(x);
    open();
  }, [open]);

  return [Modal, fullModalProps, openModal] as const;
};

type WorkItemLinkForModalProps = {
  workItem: UIWorkItem;
  workItemType: UIWorkItemType;
  flairs?: ReactNode[];
  tooltip?: string;
};

export const WorkItemLinkForModal: React.FC<WorkItemLinkForModalProps> = ({
  workItem, workItemType, flairs = [], tooltip
}) => (
  <a
    href={workItem.url}
    className="text-blue-800 hover:underline inline-flex items-start"
    target="_blank"
    rel="noreferrer"
    data-html
    data-tip={tooltip}
  >
    <img
      className="inline-block mr-2 mt-1"
      alt={`Icon for ${workItemType.name[0]}`}
      src={workItemType.icon}
      width="16"
    />
    <span>
      {workItem.id}
      {': '}
      {workItem.title}
      {flairs.map((flair, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index} className="ml-3 rounded-full bg-gray-200 px-3 py-1 text-sm no-underline self-end -mb-1">
          {flair}
        </span>
      ))}
    </span>
  </a>
);

type WorkItemFlatListProps = {
  workItems: UIWorkItem[];
  workItemType: UIWorkItemType;
  flairs?: (workItem: UIWorkItem) => ReactNode[];
  extra?: (workItem: UIWorkItem) => ReactNode;
  tooltip?: (workItem: UIWorkItem, additionalSections?: { label: string; value: string | number }[]) => string;
};

export const WorkItemFlatList: React.FC<WorkItemFlatListProps> = ({
  workItems, workItemType, flairs, extra, tooltip
}) => (
  <ul>
    {workItems.map(workItem => (
      <li key={workItem.id} className="my-3">
        <WorkItemLinkForModal
          workItem={workItem}
          workItemType={workItemType}
          flairs={flairs?.(workItem)}
          tooltip={tooltip?.(workItem)}
        />
        {extra?.(workItem)}
      </li>
    ))}
  </ul>
);

type WorkItemsNestedProps = {
  workItems: { heading: { label: string; flair?: string; flairColor?: string }; workItems: UIWorkItem[] }[];
  accessors: WorkItemAccessors;
  flairs?: (workItem: UIWorkItem) => ReactNode[];
  extra?: (workItem: UIWorkItem) => ReactNode;
  tooltip?: (workItem: UIWorkItem, additionalSections?: { label: string; value: string | number }[]) => string;
};

export const WorkItemsNested: React.FC<WorkItemsNestedProps> = ({
  workItems, accessors, flairs, extra, tooltip
}) => (
  <ul>
    {workItems.map(({ heading, workItems }) => (
      <li key={heading.label} className="my-3">
        <h3 className="font-semibold text-lg">
          {heading.label}
          {heading.flair && (
            <span
              className="text-base inline-block ml-2 px-3 rounded-full"
              style={{
                color: contrastColour(heading.flairColor || '#888'),
                backgroundColor: heading.flairColor || '#888'
              }}
            >
              {heading.flair}
            </span>
          )}
        </h3>
        <ul>
          {workItems.map(workItem => (
            <li key={workItem.id} className="py-2">
              <WorkItemLinkForModal
                workItem={workItem}
                workItemType={accessors.workItemType(workItem.typeId)}
                flairs={flairs?.(workItem)}
                tooltip={tooltip?.(workItem)}
              />
              {extra?.(workItem)}
            </li>
          ))}
        </ul>

      </li>
    ))}
  </ul>
);

export const workItemSubheading = (
  witId: string, groupName: string,
  workItems: UIWorkItem[], workItemType: WorkItemAccessors['workItemType']
) => (
  `${workItemType(witId).name[1]} ${groupName === noGroup ? '' : `/ ${groupName}`} (${workItems.length})`
);

const useWorkItemType = (workItemType: string) => {
  const cnp = useCollectionAndProject();
  const workItemTypes = trpc.workItems.getWorkItemTypes.useQuery(cnp);
  return workItemTypes.data?.find(wit => wit.name[0] === workItemType);
};

type TooltipSectionProps = {
  label: string;
  value: ReactNode;
  graphValue?: number;
  width?: 1 | 2;
};

const TooltipSection: React.FC<TooltipSectionProps> = ({
  label, value, graphValue, width
}) => (
  <div className={width === 2 ? 'col-span-2' : ''}>
    {label}
    <div className="font-semibold">
      {value}
    </div>
    {graphValue !== undefined && graphValue <= 1
      ? (
        <div className="rounded-md bg-gray-500 mt-1 h-1.5 w-full">
          <div className="bg-gray-300 h-1.5 rounded-md" style={{ width: `${graphValue * 100}%` }} />
        </div>
      )
      : ''}
  </div>
);

type WorkItemLinkForModalv2Props = {
  url: string;
  id: number;
  workItemType: string;
  title: string;
};

const WorkItemLinkForModalv2: React.FC<WorkItemLinkForModalv2Props> = ({
  id, url, workItemType, title
}) => {
  const domId = `wi-${id}`;
  const { collectionName } = useCollectionAndProject();
  const matchingWit = useWorkItemType(workItemType);
  const [hasHovered, setHasHovered] = useState(false);
  const tooltipData = trpc.workItems.workItemForTooltip.useQuery(
    { collectionName, id },
    {
      enabled: hasHovered
    }
  );

  const onHover = useCallback(() => { setHasHovered(true); }, []);

  return (
    <>
      <a
        href={url}
        className="text-blue-800 hover:underline inline-flex items-start"
        target="_blank"
        rel="noreferrer"
        data-for={domId}
        data-tip
        onMouseOver={onHover}
        onFocus={onHover}
        // {...tooltipProps}
      >
        <img
          className="inline-block mr-2 mt-1"
          alt={`Icon for ${matchingWit?.name[1] || workItemType}`}
          src={matchingWit?.icon || ''}
          width="16"
        />
        <span>{`${id}: ${title}`}</span>
      </a>
      <ReactTooltip id={domId} place="bottom">
        <div className="w-72 pt-2">
          <img
            src={matchingWit?.icon || ''}
            alt={`Icon fro ${matchingWit?.name[1] || workItemType}`}
            width="14"
            height="14"
            className="inline -mt-1 mr-2"
          />
          <strong>
            {`${id}: ${title}`}
          </strong>

          {tooltipData.data ? (
            <div className="grid grid-cols-2 gap-4 my-3">
              {matchingWit?.groupLabel && tooltipData.data.group ? (
                <TooltipSection
                  label={matchingWit.groupLabel}
                  value={tooltipData.data.group || noGroup}
                />
              ) : null}
              {tooltipData.data.state ? (
                <TooltipSection
                  label="Currently"
                  value={tooltipData.data.state}
                />
              ) : null}
              {tooltipData.data.priority === undefined ? null : (
                <TooltipSection
                  label="Priority"
                  value={(
                    <>
                      <span
                        className="inline-block w-2 h-2 mr-1"
                        style={{ background: priorityBasedColor(tooltipData.data.priority) }}
                      />
                      {tooltipData.data.priority}
                    </>
                  )}
                />
              )}
              {tooltipData.data.severity === undefined ? null : (
                <TooltipSection
                  label="Severity"
                  value={tooltipData.data.severity}
                />
              )}
              {tooltipData.data.rca?.length ? (
                <TooltipSection
                  label="RCA"
                  value={tooltipData.data.rca.join(' / ')}
                  width={2}
                />
              ) : null}
              {
                // eslint-disable-next-line no-nested-ternary
                tooltipData.data.cycleTime ? (
                  <TooltipSection
                    label="Cycle time"
                    value={prettyMS(tooltipData.data.cycleTime)}
                  />
                ) : (tooltipData.data.startDate ? (
                  <TooltipSection
                    label="Age"
                    value={prettyMS(Date.now() - tooltipData.data.startDate.getTime())}
                  />
                ) : null)
              }
              {tooltipData.data.clt ? (
                <TooltipSection
                  label="Change lead time"
                  value={prettyMS(tooltipData.data.clt)}
                  graphValue={
                    tooltipData.data.cycleTime
                      // eslint-disable-next-line unicorn/no-useless-undefined
                      ? divide(tooltipData.data.clt, tooltipData.data.cycleTime).getOr(undefined)
                      : undefined
                  }
                />
              ) : null}
              {/* TODO: Missing: Worst offender, efficiency */}
            </div>
          ) : (
            <div className="my-3">
              <Loading />
            </div>
          )}
        </div>
      </ReactTooltip>
    </>
  );
};

type WorkItemsByDateProps = {
  workItems: {title: string; id: number; date: Date; url: string}[];
  workItemTypeName: string;
  groupName: string;
};

export const WorkItemsByDate: React.FC<WorkItemsByDateProps> = ({
  workItems, workItemTypeName, groupName
}) => {
  const cnp = useCollectionAndProject();
  const workItemTypes = trpc.workItems.getWorkItemTypes.useQuery(cnp);

  const groupedByDate = useMemo(() => (
    workItems
      .sort(asc(byDate(prop('date'))))
      .reduce<Record<string, typeof workItems>>((acc, workItem) => {
        const dateString = shortDate(workItem.date);
        acc[dateString] = acc[dateString] || [];
        acc[dateString].push(workItem);
        return acc;
      }, {})
  ), [workItems]);

  if (!workItemTypes.data) return <Loading />;

  return (
    <ul>
      {Object.entries(groupedByDate || {}).map(([dateString, workItems]) => (
        <li key={dateString} className="my-3">
          <h3 className="font-semibold text-lg">
            {dateString}
            <span
              className="text-base inline-block ml-2 px-3 rounded-full"
              style={{
                color: contrastColour(lineColor({ witId: workItemTypeName, groupName })),
                backgroundColor: lineColor({ witId: workItemTypeName, groupName })
              }}
            >
              {workItems.length}
            </span>
          </h3>
          <ul>
            {workItems.map(workItem => (
              <li key={workItem.id} className="py-2">
                <WorkItemLinkForModalv2
                  id={workItem.id}
                  title={workItem.title}
                  url={workItem.url}
                  workItemType={workItemTypeName}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

type WorkItemsByGroupProps = {
  workItems: {
    id: number;
    title: string;
    url: string;
    date: Date;
    type: string;
    group: string;
  }[];
};

const groupLabel = (workItem: WorkItemsByGroupProps['workItems'][number]) => (
  workItem.group === noGroup ? workItem.type : (`${workItem.type} - ${workItem.group}`)
);

export const WorkItemsByGroup: React.FC<WorkItemsByGroupProps> = ({ workItems }) => {
  const cnp = useCollectionAndProject();
  const workItemTypes = trpc.workItems.getWorkItemTypes.useQuery(cnp);

  const groupedByGroup = useMemo(() => (
    workItems
      .reduce<Record<string, { color: string; workItems: typeof workItems }>>((acc, workItem) => {
        const label = groupLabel(workItem);
        acc[label] = acc[label] || {
          color: lineColor({ witId: workItem.type, groupName: workItem.group }),
          workItems: []
        };

        acc[label].workItems.push(workItem);
        return acc;
      }, {})
  ), [workItems]);

  if (!workItemTypes.data) return <Loading />;

  return (
    <ul>
      {Object.entries(groupedByGroup || {}).map(([label, { color, workItems }]) => (
        <li key={label} className="my-3">
          <h3 className="font-semibold text-lg">
            {label}
            <span
              className="text-base inline-block ml-2 px-3 rounded-full"
              style={{
                color: contrastColour(color),
                backgroundColor: color
              }}
            >
              {workItems.length}
            </span>
          </h3>
          <ul>
            {workItems.map(workItem => (
              <li key={workItem.id} className="py-2">
                <WorkItemLinkForModalv2
                  id={workItem.id}
                  title={workItem.title}
                  url={workItem.url}
                  workItemType={workItem.type}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};
