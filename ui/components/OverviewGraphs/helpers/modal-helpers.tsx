import { prop } from 'rambda';
import type { ReactNode } from 'react';
import React, { useMemo, useCallback, useState } from 'react';
import { asc, byDate } from 'sort-lib';
import type { UIWorkItem, UIWorkItemType } from '../../../../shared/types.js';
import { trpc } from '../../../helpers/trpc.js';
import { contrastColour, shortDate } from '../../../helpers/utils.js';
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

  const matchingWit = workItemTypes.data.find(wit => wit.name[0] === workItemTypeName);

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
                <a
                  href={workItem.url}
                  className="text-blue-800 hover:underline inline-flex items-start"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    className="inline-block mr-2 mt-1"
                    alt={`Icon for ${matchingWit?.name[1] || workItemTypeName}`}
                    src={matchingWit?.icon || ''}
                    width="16"
                  />
                  <span>
                    {workItem.id}
                    {': '}
                    {workItem.title}
                  </span>
                </a>
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
            {workItems.map(workItem => {
              const matchingWit = workItemTypes.data.find(wit => wit.name[0] === workItem.type);

              return (
                <li key={workItem.id} className="py-2">
                  <a
                    href={workItem.url}
                    className="text-blue-800 hover:underline inline-flex items-start"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      className="inline-block mr-2 mt-1"
                      alt={`Icon for ${matchingWit?.name[1] || workItem.type}`}
                      src={matchingWit?.icon || ''}
                      width="16"
                    />
                    <span>
                      {workItem.id}
                      {': '}
                      {workItem.title}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
};
