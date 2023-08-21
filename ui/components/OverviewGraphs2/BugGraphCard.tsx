import type { MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { append, filter, not, prop } from 'rambda';
import { twJoin } from 'tailwind-merge';
import { ExternalLink } from 'react-feather';
import { byNum, desc } from 'sort-lib';
import { lineColor, prettyFields } from './utils.jsx';
import Switcher from '../common/Switcher.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import { DownChevron, UpChevron } from '../common/Icons.jsx';
import type { BugWorkItems, Group } from './BugLeakage.jsx';
import { num } from '../../helpers/utils.js';
import { useDrawer } from '../common/Drawer.jsx';
import { noGroup } from '../../../shared/work-item-utils.js';

const combinedBugs = (
  data: BugWorkItems,
  selectedField: string,
  selectedGroups: string[]
) => {
  if (!data) return null;

  const rcaFieldGroupedBugs = data.find(field => field.rootCauseField === selectedField);

  if (!rcaFieldGroupedBugs) return null;

  const groupedBugs = rcaFieldGroupedBugs.groups.filter(group =>
    selectedGroups.includes(group.groupName)
  );

  const combinedBugs = groupedBugs.flatMap(group => group.bugs);

  const combinedBugsGroupedByRootCauseType = combinedBugs.reduce((acc, bug) => {
    acc.set(bug.rootCauseType, (acc?.get(bug.rootCauseType) || 0) + bug.count);
    return acc;
  }, new Map<string, number>());

  const list = Array.from(
    combinedBugsGroupedByRootCauseType,
    ([rootCauseType, count]) => ({
      rootCauseType,
      count,
    })
  ).sort(desc(byNum(l => l.count)));

  const max = Math.max(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...list.map(({ count, ...rest }) => count)
  );

  const total = list.reduce((acc, bug) => acc + bug.count, 0);

  return {
    list: list.map(bug => ({
      ...bug,
      percentage: divide(total, bug.count || 0)
        .map(toPercentage)
        .getOr('-'),
    })),
    total,
    max,
  };
};

export type BugGraphCardProps = {
  // workItemConfig: SingleWorkItemConfig;
  data: BugWorkItems;
  groups: Group[];
  rcaFields: { label: string; value: string }[];
  drawer?: (groupName: string) => {
    heading: ReactNode;
    children: ReactNode;
  };
};

const BugGraphCard = ({
  // workItemConfig,
  data,
  groups,
  rcaFields,
  drawer,
}: BugGraphCardProps) => {
  // TODO: Drawer
  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [additionalDrawerProps, setAdditionalDrawerProps] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({
    heading: 'Loading...',
    children: 'Loading...',
  });

  const [groupsForField, setGroupsForField] = useState<Group[]>([]);
  const [selectedField, setSelectedField] = useState<string | undefined>(
    rcaFields && rcaFields.length > 0 ? rcaFields[0]?.value : undefined
  );
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    groupsForField.map(prop('groupName'))
  );
  const collapsedCount = 10;
  const [isExpanded, setIsExpanded] = useState(false);

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

  useEffect(() => {
    setGroupsForField(
      groups
        .filter(group => group.rootCauseField === selectedField)
        .sort(desc(byNum(g => g.count)))
    );
  }, [groups, selectedField]);

  useEffect(() => {
    setSelectedField(rcaFields && rcaFields.length > 0 ? rcaFields[0]?.value : undefined);
  }, [rcaFields]);

  useEffect(() => {
    setSelectedGroups((groups || []).map(prop('groupName')));
  }, [groups]);

  if (!data) return null;

  return (
    <div className="contents">
      <Drawer {...drawerProps} {...additionalDrawerProps} />
      <div
        className={twJoin(
          'rounded-xl border border-theme-seperator p-4 mt-4 mb-4',
          'bg-theme-page-content group/block'
        )}
        style={{
          boxShadow: 'rgba(30, 41, 59, 0.05) 0px 4px 8px',
        }}
      >
        <div className="flex justify-between">
          <div className={twJoin('bg-theme-page-content group/block')}>
            <div className="grid grid-flow-col justify-between items-end">
              <div className="text-lg font-bold flex items-center gap-2">
                {num(groups.reduce((sum, group) => sum + group.count, 0) || 0)}
                {groupsForField.length === 1 &&
                groupsForField[0].groupName === 'noGroup' ? (
                  <button
                    className="link-text opacity-0 transition-opacity group-hover/block:opacity-100"
                    // TODO: Drawer
                    onClick={openDrawerFromGroupPill(noGroup)}
                  >
                    <ExternalLink size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-start">
            {data && rcaFields.length > 1 && selectedField ? (
              <Switcher
                options={rcaFields}
                onChange={e => setSelectedField(e)}
                value={selectedField}
              />
            ) : null}
          </div>
        </div>
        <div className="flex">
          <ul className="grid grid-flow-col gap-2">
            {groupsForField.length === 1 && groupsForField[0].groupName === 'noGroup'
              ? null
              : groupsForField.map(group => (
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
                          ? 'bg-theme-page-content'
                          : 'bg-theme-col-header'
                      )}
                      style={{
                        borderLeftColor: lineColor(group.groupName),
                        boxShadow: 'rgba(30, 41, 59, 0.05) 0px 4px 3px',
                        width: 'calc((100vw - 17.5rem) / 8)',
                      }}
                    >
                      <div>{group.groupName || 'Unclassified'}</div>
                      <div className="font-medium flex items-end">
                        <span>{num(group.count)}</span>
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
          <ul className="text-sm flex gap-2 items-center ml-4">
            {selectedGroups.length !== data.length && (
              <li
                className={
                  selectedGroups.length === 0
                    ? ''
                    : 'border-r border-theme-seperator pr-2'
                }
              >
                <button
                  className="link-text font-semibold"
                  onClick={() => setSelectedGroups(groupsForField.map(prop('groupName')))}
                >
                  Select all
                </button>
              </li>
            )}
            {selectedGroups.length !== 0 && (
              <li>
                <button
                  className="link-text font-semibold"
                  onClick={() => setSelectedGroups([])}
                >
                  Clear all
                </button>
              </li>
            )}
          </ul>
        </div>

        {data ? (
          <>
            <ul>
              {combinedBugs(data, selectedField || '', selectedGroups)
                ?.list.slice(0, isExpanded ? undefined : collapsedCount)
                .map(bug => (
                  <li key={bug.rootCauseType} className="p2">
                    <button
                      className="grid gap-4 pl-3 my-3 w-full rounded-lg items-center hover:bg-gray-100 cursor-pointer"
                      style={{ gridTemplateColumns: '20% 1fr 85px' }}
                    >
                      <div className="flex items-center justify-end">
                        <span className="truncate">{bug.rootCauseType}</span>
                      </div>
                      <div className="bg-gray-100 rounded-md overflow-hidden">
                        <div
                          className="rounded-md"
                          style={{
                            width: `${divide(
                              bug.count,
                              combinedBugs(data, selectedField || '', selectedGroups)
                                ?.max || 0
                            )
                              .map(toPercentage)
                              .getOr(`0%`)}`,
                            backgroundColor: 'rgba(66, 212, 244, 1)',
                            height: '30px',
                          }}
                        />
                      </div>
                      <span className="justify-self-start">
                        <b>
                          {divide(
                            bug.count,
                            combinedBugs(data, selectedField || '', selectedGroups)
                              ?.total || 0
                          )
                            .map(toPercentage)
                            .getOr('-')}
                        </b>
                        <span className="text-sm text-gray-500">{` (${num(
                          bug.count
                        )})`}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            {(combinedBugs(data, selectedField || '', selectedGroups)?.list || [])
              .length > collapsedCount && (
              <div className="flex justify-end">
                <button
                  className="text-blue-700 text-sm flex items-center hover:text-blue-900 hover:underline"
                  onClick={() => setIsExpanded(not)}
                >
                  {isExpanded ? (
                    <UpChevron className="w-4 mr-1" />
                  ) : (
                    <DownChevron className="w-4 mr-1" />
                  )}
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-600 italic text-sm">Couldn't find any RCA data.</p>
        )}
      </div>
      {data && data.length > 0 ? (
        <p className="text-sm text-theme-helptext">
          The root cause for a bug is determined from{' '}
          {prettyFields(data.map(rootCause => rootCause.rootCauseField))}
        </p>
      ) : null}
    </div>
  );
};

export default BugGraphCard;
