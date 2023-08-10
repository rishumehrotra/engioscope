import type { MouseEvent, ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import { append, filter, prop, range } from 'rambda';
import { twJoin } from 'tailwind-merge';
import { ExternalLink } from 'react-feather';
import { trpc, type SingleWorkItemConfig } from '../../helpers/trpc.js';
import { num } from '../../helpers/utils.js';
import { noGroup } from '../../../shared/work-item-utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { useDrawer } from '../common/Drawer.jsx';
import type { useDecorateForGraph } from './utils.jsx';
import type {
  CountResponse,
  DateDiffResponse,
} from '../../../backend/models/workitems2.js';

export type GraphCardProps<T extends CountResponse | DateDiffResponse> = {
  workItemConfig: SingleWorkItemConfig;
  subheading: ReactNode;
  index: number;
  data: T[];
  combineToValue: (x: T[]) => number;
  formatValue?: (x: number) => string | number;
  graphRenderer: (selectedGroups: string[]) => ReactNode;
  lineColor: (groupName: string) => string;
  drawer?: (groupName: string) => {
    heading: ReactNode;
    children: ReactNode;
  };
};

export const GraphCard = <T extends CountResponse | DateDiffResponse>({
  workItemConfig,
  subheading,
  index,
  data,
  combineToValue,
  formatValue = num,
  graphRenderer,
  lineColor,
  drawer,
}: GraphCardProps<T>) => {
  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [additionalDrawerProps, setAdditionalDrawerProps] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({
    heading: 'Loading...',
    children: 'Loading...',
  });
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    data.map(prop('groupName'))
  );

  const toggleSelectedGroup = useCallback(
    (groupName: string) => {
      if (selectedGroups.includes(groupName)) {
        setSelectedGroups(filter(x => x !== groupName));
      } else {
        setSelectedGroups(append(groupName));
      }
    },
    [selectedGroups]
  );

  const openDrawerFromGroupPill = useCallback(
    (groupName: string) => (event: MouseEvent) => {
      event.stopPropagation();
      if (drawer) {
        setAdditionalDrawerProps(drawer(groupName));
        openDrawer();
      }
    },
    [drawer, openDrawer]
  );

  return (
    <div className="contents">
      <Drawer {...drawerProps} {...additionalDrawerProps} />
      <h3 className="flex items-center gap-3" style={{ gridArea: `heading${index}` }}>
        <img
          className="w-4 h-4 inline-block"
          src={workItemConfig.icon}
          alt={`Icon for ${workItemConfig.name[1]}`}
        />
        <span className="text-lg font-medium">{workItemConfig.name[1]}</span>
      </h3>
      <p
        className="text-sm text-theme-helptext"
        style={{ gridArea: `subheading${index}` }}
      >
        {subheading}
      </p>
      <div
        className={twJoin(
          'rounded-xl border border-theme-seperator p-4 mt-4 mb-8',
          'grid grid-flow-row gap-2',
          'grid-rows-[min-content_min-content_1fr_min-content_min-content]',
          'bg-theme-page-content'
        )}
        style={{ gridArea: `graphBlock${index}` }}
      >
        <div className="grid grid-flow-col justify-between items-end">
          <div className="text-lg font-medium flex items-center gap-2">
            {formatValue(combineToValue(data))}
            {data.length === 1 && data[0].groupName === noGroup ? (
              <button className="link-text">
                <ExternalLink size={16} />
              </button>
            ) : null}
          </div>
          <ul className="text-sm flex gap-2">
            {selectedGroups.length !== data.length && (
              <li
                className={twJoin(
                  'pr-2',
                  selectedGroups.length === 0 ? '' : 'border-r border-theme-seperator'
                )}
              >
                <button
                  className="link-text"
                  onClick={() => setSelectedGroups(data.map(prop('groupName')))}
                >
                  Select all
                </button>
              </li>
            )}
            {selectedGroups.length !== 0 && (
              <li>
                <button className="link-text" onClick={() => setSelectedGroups([])}>
                  Clear all
                </button>
              </li>
            )}
          </ul>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {data.length === 1 && data[0].groupName === noGroup
            ? null
            : data.map(group => (
                <li key={group.groupName}>
                  <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelectedGroup(group.groupName);
                      }
                    }}
                    onClick={() => toggleSelectedGroup(group.groupName)}
                    className={twJoin(
                      'block h-full border border-l-2 border-theme-seperator rounded-lg p-2 w-full',
                      'text-sm text-left transition-all duration-200 group',
                      'hover:ring-theme-input-highlight hover:ring-1',
                      selectedGroups.includes(group.groupName)
                        ? 'bg-theme-page-content shadow'
                        : 'bg-theme-col-header'
                    )}
                    style={{
                      borderLeftColor: lineColor(group.groupName),
                    }}
                  >
                    <div>{group.groupName || 'Unclassified'}</div>
                    <div className="font-medium flex items-end">
                      <span>{formatValue(combineToValue([group]))}</span>
                      {drawer && (
                        <button
                          className={twJoin(
                            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                            'group-focus-visible:opacity-100'
                          )}
                          onClick={openDrawerFromGroupPill(group.groupName)}
                        >
                          <ExternalLink className="w-4 mx-2 -mb-0.5 link-text" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
        </ul>
        <div className="self-end min-h-[20rem] flex items-end justify-center">
          {graphRenderer(selectedGroups)}
        </div>
        {/* <div className="text-sm text-theme-helptext">Priority</div> */}
      </div>
    </div>
  );
};

export const useGridTemplateAreas = () => {
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery({ queryContext });

  if (!pageConfig.data?.workItemsConfig) return;

  const rowCount = Math.ceil(pageConfig.data.workItemsConfig.length / 2);

  const graphGrid = range(0, rowCount).reduce<
    [SingleWorkItemConfig | undefined, SingleWorkItemConfig | undefined][]
  >((acc, rowIndex) => {
    acc.push([
      pageConfig.data.workItemsConfig?.[2 * rowIndex],
      pageConfig.data.workItemsConfig?.[2 * rowIndex + 1],
    ]);
    return acc;
  }, []);

  return graphGrid
    ?.reduce<string[]>((acc, configs, index) => {
      acc.push(
        `"heading${2 * index} heading${2 * index + 1}"`,
        `"subheading${2 * index} subheading${2 * index + 1}"`,
        `"graphBlock${2 * index} graphBlock${2 * index + 1}"`
      );
      return acc;
    }, [])
    .join(' ');
};

export const drawerHeading = (
  title: string,
  config: NonNullable<ReturnType<typeof useDecorateForGraph>>[number]['config'],
  count?: number
) => {
  return (
    <>
      {title}
      <span className="inline-flex text-base ml-2 font-normal text-theme-helptext items-center gap-2">
        <img src={config.icon} className="w-4" alt={`Icon for ${config.name[1]}`} />
        <span>
          {config.name[1]} {count !== undefined && `(${count})`}
        </span>
      </span>
    </>
  );
};
