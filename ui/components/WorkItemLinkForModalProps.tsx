import React from 'react';
import type { ReactNode } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../shared/types';

type WorkItemLinkForModalProps = {
  workItem: UIWorkItem;
  workItemType: UIWorkItemType;
  flair?: ReactNode;
};
export const WorkItemLinkForModal: React.FC<WorkItemLinkForModalProps> = ({ workItem, workItemType, flair }) => (
  <a
    href={workItem.url}
    className="text-blue-800 hover:underline inline-flex items-start"
    target="_blank"
    rel="noreferrer"
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
      {flair && (
        <span className="ml-3 rounded-full bg-gray-200 px-3 py-1 text-sm no-underline self-baseline -mb-1">
          {flair}
        </span>
      )}
    </span>
  </a>
);
