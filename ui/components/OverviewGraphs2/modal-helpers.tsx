import type { ReactNode } from 'react';
import React, { useMemo, useCallback, useState } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';
import { modalHeading, useModal } from '../common/Modal';
import type { WorkItemAccessors } from './helpers';

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
      {flairs.map(flair => (
        <span className="ml-3 rounded-full bg-gray-200 px-3 py-1 text-sm no-underline self-end -mb-1">
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

export const workItemSubheading = (
  witId: string, groupName: string,
  workItems: UIWorkItem[], workItemType: WorkItemAccessors['workItemType']
) => (
  `${workItemType(witId).name[1]} / ${groupName} (${workItems.length})`
);
