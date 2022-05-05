import { range } from 'rambda';
import React, { useCallback, useState } from 'react';
import type { UIChangeProgramTask } from '../../../shared/types';
import {
  CircularAlert, CircularCheckmark, Minus, Plus
} from '../common/Icons';
import type {
  ListingType, OrganizedTasks, RollupTaskState, TaskState
} from './change-program-utils';
import { taskTooltip } from './change-program-utils';

const styleForState = (state: RollupTaskState) => {
  switch (state) {
    case 'completed-on-time': return 'bg-green-600 border-green-600 completed-on-time';
    case 'completed-late': return 'bg-orange-400 border-orange-400 completed-late';
    case 'overdue': return 'bg-red-600 border-red-600 text-white overdue';
    case 'planned': return 'border-black planned';
    case 'unplanned': return 'border-black unplanned';
    default: return 'border-transparent';
  }
};

const styleForTask = (state: TaskState) => {
  switch (state) {
    case 'completed-on-time': return 'text-green-600';
    case 'completed-late': return 'text-orange-400 completed-late';
    case 'overdue': return 'text-red-600 overdue';
    case 'planned': return 'text-gray-500';
    default: return '';
  }
};

const formatTitle = (task: UIChangeProgramTask) => {
  const regex = new RegExp(`.*${task.team.split(' ').join('\\ ')}\\s+\\|\\s+(.*)`);
  const match = task.title.match(regex);
  if (!match) return `${task.id}: ${task.title.trim()}`;
  return `${task.id}: ${match[1].trim()}`;
};

type ActivitySubgroupProps = {
  subgroup: OrganizedTasks['planned'][number]['subgroups'][number];
  isHovered: (weekIndex: number) => boolean;
  mouseEvents: (weekIndex: number) => {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
  listingType: ListingType;
};

const ActivitySubGroup: React.FC<ActivitySubgroupProps> = ({
  subgroup, isHovered, mouseEvents, listingType
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td>
          <div
            className="grid grid-cols-2 items-center gap-2 p-2 ml-8"
            style={{ gridTemplateColumns: '25px 1fr' }}
          >
            <div>
              {subgroup.tasks.length
                ? (
                  <span className="text-lg bg-gray-700 px-1 text-white font-semibold rounded-md">
                    {isExpanded
                      ? <Minus className="w-4 -mt-1 inline-block" />
                      : <Plus className="w-4 -mt-1 inline-block" />}
                  </span>
                )
                : (
                  <span className="text-lg px-1 font-semibold w-10"> </span>
                )}
            </div>
            <span>
              {subgroup.subgroupName}
              <span className="text-sm text-gray-500">
                {`: ${listingType === 'planned' ? 'Planned' : 'Unplanned'}: ${subgroup.tasks.length} of ${subgroup.totalTasks}`}
              </span>
            </span>
          </div>
        </td>
        {subgroup.rolledUpByWeek.map((value, index) => (
          <td
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`text-center ${isHovered(index) ? 'bg-gray-100' : ''}`}
            {...mouseEvents(index)}
          >
            <span className={`px-2 py-1 rounded-lg text-sm border ${styleForState(value.state)}`}>
              {value.count || ' '}
            </span>
          </td>
        ))}
      </tr>
      {isExpanded && (
        subgroup.tasks.map(({
          task, weekIndex, status, weekCount
        }) => (
          <tr
            key={task.id}
            className="hover:bg-gray-100"
            data-tip={taskTooltip(task)}
            data-html
          >
            <td className="text-lg pr-4 py-1">
              <a
                href={task.url}
                target="_blank"
                rel="noreferrer"
                className="link-text text-base pl-20 inline-block truncate max-w-screen-sm"
              >
                {formatTitle(task)}
              </a>
            </td>
            {range(0, weekCount).map(value => (
              <td
                key={value}
                className={`text-center ${
                  value === weekIndex ? styleForTask(status) : ''
                } ${
                  isHovered(value) ? 'bg-gray-100' : ''
                }`}
                {...mouseEvents(value)}
              >
                {/* eslint-disable-next-line no-nested-ternary */}
                {value === weekIndex
                  ? (
                    status === 'overdue'
                      ? <CircularAlert className="w-5 m-auto" />
                      : <CircularCheckmark className="w-5 m-auto" />
                  )
                  : ' '}
              </td>
            ))}
          </tr>
        ))
      )}
    </>
  );
};

type ActivityGroupItemProps = {
  group: OrganizedTasks['planned'][number];
  isHovered: (weekIndex: number) => boolean;
  mouseEvents: (weekIndex: number) => {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
  listingType: ListingType;
};

const ActivityGroupItem: React.FC<ActivityGroupItemProps> = ({
  group, isHovered, mouseEvents, listingType
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <>
      <tr
        className="hover:bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="w-full">
          <div
            className="grid grid-cols-2 items-center gap-2 p-2"
            style={{ gridTemplateColumns: '25px 1fr' }}
          >
            <div>
              <span className="text-lg bg-gray-700 px-1 text-white font-semibold rounded-md">
                {isExpanded
                  ? <Minus className="w-4 -mt-1 inline-block" />
                  : <Plus className="w-4 -mt-1 inline-block" />}
              </span>
            </div>
            <span>
              {group.groupName}
              <span className="text-sm text-gray-500">
                {`: ${listingType === 'planned' ? 'Planned' : 'Unplanned'}: ${group.groupTasks} of ${group.totalTasks}`}
              </span>
            </span>
          </div>
        </td>
        {group.rolledUpByWeek.map(({ state, count }, index) => (
          <td
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`text-center ${isHovered(index) ? 'bg-gray-100' : ''}`}
            {...mouseEvents(index)}
          >
            <span className={`px-2 py-1 rounded-lg text-sm border border-transparent ${styleForState(state)}`}>
              {count === 0 ? ' ' : count}
            </span>
          </td>
        ))}
      </tr>
      {isExpanded && (
        group.subgroups.map(subgroup => (
          <ActivitySubGroup
            key={subgroup.subgroupName}
            subgroup={subgroup}
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            listingType={listingType}
          />
        ))
      )}
    </>
  );
};

type TableHeaderProps = {
  isHovered: (weekIndex: number) => boolean;
  mouseEvents: (weekIndex: number) => {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
  title: string;
  weeks: OrganizedTasks['weeks'];
};

const TableHeader: React.FC<TableHeaderProps> = ({
  title, weeks, isHovered, mouseEvents
}) => (
  <tr>
    <th className="text-left w-1/2">
      <h2 className="text-xl font-semibold mt-16 mb-2">{title}</h2>
    </th>
    {weeks.map((week, weekIndex) => (
      <th
        key={week.label}
        className="relative text-center"
        {...mouseEvents(weekIndex)}
      >
        <div className="absolute -bottom-2 -ml-2 text-left origin-top-left pl-2 -rotate-45 w-32 text-xs font-normal text-gray-600">
          <span className={`p-1 rounded-md ${
            week.highlight ? 'bg-orange-300' : ''
          } ${isHovered(weekIndex) ? 'font-semibold' : ''}`}
          >
            {week.label}
          </span>
        </div>
      </th>
    ))}
  </tr>
);

const GroupedListing: React.FC<{ groups: OrganizedTasks}> = ({ groups }) => {
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);

  const mouseEvents = useCallback((weekIndex: number) => ({
    onMouseOver: () => setHoveredWeekIndex(weekIndex),
    onMouseOut: () => setHoveredWeekIndex(null)
  }), []);

  const isHovered = (weekIndex: number) => hoveredWeekIndex === weekIndex;

  return (
    <>
      <table className="w-full" cellPadding="3">
        <tbody>
          <TableHeader
            title="Planned activities"
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={groups.weeks}
          />
          {groups.planned.map(group => (
            <ActivityGroupItem
              key={group.groupName}
              group={group}
              isHovered={isHovered}
              mouseEvents={mouseEvents}
              listingType="planned"
            />
          ))}
          <TableHeader
            title="Unplanned activities"
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={groups.weeks}
          />
          {groups.unplanned.map(group => (
            <ActivityGroupItem
              key={group.groupName}
              group={group}
              isHovered={isHovered}
              mouseEvents={mouseEvents}
              listingType="unplanned"
            />
          ))}
        </tbody>
      </table>
    </>
  );
};

export default GroupedListing;
