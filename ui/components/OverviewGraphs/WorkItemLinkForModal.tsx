import React from 'react';
import type { ReactNode } from 'react';
import type { UIWorkItem, UIWorkItemType } from '../../../shared/types';

type WorkItemLinkForModalProps = {
  workItem: UIWorkItem;
  workItemType: UIWorkItemType;
  flair?: ReactNode;
  tooltip?: (workItem: UIWorkItem, additionalSections?: { label: string; value: string | number }[]) => string;
};

export const WorkItemLinkForModal: React.FC<WorkItemLinkForModalProps> = ({
  workItem, workItemType, flair, tooltip
}) => (
  <a
    href={workItem.url}
    className="text-blue-800 hover:underline inline-flex items-start"
    target="_blank"
    rel="noreferrer"
    data-html
    data-tip={tooltip?.(workItem)}
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
        <span className="ml-3 rounded-full bg-gray-200 px-3 py-1 text-sm no-underline self-end -mb-1">
          {flair}
        </span>
      )}
    </span>
  </a>
);
