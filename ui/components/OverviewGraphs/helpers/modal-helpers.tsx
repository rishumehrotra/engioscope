import type { ReactNode } from 'react';
import React, { useMemo, useCallback, useState } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../../shared/types';
import { contrastColour } from '../../../helpers/utils';
import { modalHeading, useModal } from '../../common/Modal';
import type { WorkItemAccessors } from './helpers';
import { noGroup } from './helpers';

export type ModalArgs = {
  heading: ReactNode;
  subheading: ReactNode;
  body: ReactNode;
};

export const useWorkItemModal = () => {
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
