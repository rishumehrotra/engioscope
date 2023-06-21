import { not, prop, range } from 'rambda';
import React, { useCallback, useState } from 'react';
import { count, incrementBy } from '../../../shared/reducer-utils.js';
import type { UIChangeProgramTask } from '../../../shared/types.js';
import { CircularAlert, CircularCheckmark, Minus, Plus } from '../common/Icons.js';
import type {
  OrganizedTasks,
  RollupTaskState,
  TaskState,
} from './change-program-utils.js';
import { rollupTooltip, taskTooltip } from './change-program-utils.js';
import useHover from '../../hooks/use-hover.js';

const styleForState = (state: RollupTaskState) => {
  switch (state) {
    case 'completed-on-time': {
      return 'bg-green-600 border-green-600 text-white completed-on-time';
    }
    case 'completed-late': {
      return 'bg-amber-400 border-amber-400 completed-late';
    }
    case 'overdue': {
      return 'bg-red-600 border-red-600 text-white overdue';
    }
    case 'planned': {
      return 'border-black planned';
    }
    case 'unplanned': {
      return 'border-black unplanned';
    }
    default: {
      return 'border-transparent';
    }
  }
};

const styleForTask = (state: TaskState) => {
  switch (state) {
    case 'completed-on-time': {
      return 'text-green-600';
    }
    case 'completed-late': {
      return 'text-amber-500 completed-late';
    }
    case 'overdue': {
      return 'text-red-700 overdue';
    }
    case 'planned': {
      return 'text-gray-500';
    }
    default: {
      return '';
    }
  }
};

const formatTitle = (task: UIChangeProgramTask) => {
  const regex = new RegExp(`.*${task.team.split(' ').join('\\ ')}\\s+\\|\\s+(.*)`);
  const match = task.title.match(regex);
  if (!match) return `${task.id}: ${task.title.trim()}`;
  return `${task.id}: ${match[1].trim()}`;
};

type TaskProps = {
  taskDetails: OrganizedTasks['planned'][number]['subgroups'][number]['tasks'][number];
  isHovered: (weekIndex: number) => boolean;
  mouseEvents: (weekIndex: number) => {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
  weeks: OrganizedTasks['weeks'];
};

const Task: React.FC<TaskProps> = ({
  taskDetails: { task, weekIndex, weekCount, status },
  isHovered,
  mouseEvents,
  weeks,
}) => {
  const [ref, onRowHover] = useHover<HTMLTableRowElement>();

  return (
    <tr
      key={task.id}
      className="bg-gray-50 hover:bg-gray-100"
      ref={ref}
      data-tooltip-id="react-tooltip"
      data-tooltip-html={taskTooltip(task)}
    >
      <td
        className={`text-lg sticky z-10 left-0 ${
          onRowHover ? 'bg-gray-100' : 'bg-gray-50'
        }`}
      >
        <div className="border-r border-gray-300 pr-4 py-1 ">
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className="link-text text-base pl-28 inline-block truncate max-w-screen-sm"
          >
            {formatTitle(task)}
          </a>
        </div>
      </td>
      {range(0, weekCount).map((value, wIndex) => (
        <td
          key={value}
          className={`text-center ${value === weekIndex ? styleForTask(status) : ''} ${
            isHovered(value)
              ? weeks[wIndex].highlight
                ? 'bg-blue-200'
                : 'bg-gray-100'
              : weeks[wIndex].highlight
              ? 'bg-blue-100'
              : ''
          }`}
          {...mouseEvents(value)}
        >
          {}
          {value === weekIndex ? (
            status === 'overdue' ? (
              <CircularAlert className="w-5 m-auto" />
            ) : (
              <CircularCheckmark className="w-5 m-auto" />
            )
          ) : (
            ' '
          )}
        </td>
      ))}
    </tr>
  );
};

type ActivitySubgroupProps = {
  subgroup: OrganizedTasks['planned'][number]['subgroups'][number];
  isHovered: (weekIndex: number) => boolean;
  mouseEvents: (weekIndex: number) => {
    onMouseOver: () => void;
    onMouseOut: () => void;
  };
  weeks: OrganizedTasks['weeks'];
};

const ActivitySubGroup: React.FC<ActivitySubgroupProps> = ({
  subgroup,
  isHovered,
  mouseEvents,
  weeks,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [ref, isSubGroupRowHovered] = useHover<HTMLTableRowElement>();

  return (
    <>
      <tr
        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        ref={ref}
      >
        <td
          className={`sticky z-20 left-0 ${
            isSubGroupRowHovered ? 'bg-gray-100' : 'bg-gray-50'
          }`}
        >
          <div
            className="grid grid-cols-2 items-center gap-2 p-2 ml-16 border-r border-gray-300"
            style={{ gridTemplateColumns: '25px 1fr' }}
          >
            <div>
              {subgroup.tasks.length ? (
                <span className="text-lg bg-gray-700 px-1 text-white font-semibold rounded-md">
                  {isExpanded ? (
                    <Minus className="w-4 -mt-1 inline-block" />
                  ) : (
                    <Plus className="w-4 -mt-1 inline-block" />
                  )}
                </span>
              ) : (
                <span className="text-lg px-1 font-semibold w-10"> </span>
              )}
            </div>
            <span>
              {subgroup.subgroupName}
              <span className="pl-2 text-xs text-gray-600">
                {`${subgroup.tasks.length} of ${subgroup.totalTasks}`}
              </span>
            </span>
          </div>
        </td>
        {subgroup.rolledUpByWeek.map((value, index) => (
          <td
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`sticky z-10 left-0 text-center ${
              isHovered(index)
                ? weeks[index].highlight
                  ? 'bg-blue-200'
                  : 'bg-gray-100'
                : weeks[index].highlight
                ? 'bg-blue-100'
                : ''
            }`}
            {...mouseEvents(index)}
            data-tooltip-id="react-tooltip"
            data-tooltip-html={rollupTooltip(
              subgroup.tasks.filter(t => t.weekIndex === index).map(t => t.task),
              weeks[index]
            )}
          >
            <span
              className={`px-2 py-1 rounded-lg text-sm border-2 font-semibold ${styleForState(
                value.state
              )}`}
            >
              {value.count || ' '}
            </span>
          </td>
        ))}
      </tr>
      {isExpanded &&
        subgroup.tasks.map(taskDetails => (
          <Task
            taskDetails={taskDetails}
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={weeks}
          />
        ))}
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
  weeks: OrganizedTasks['weeks'];
};

const ActivityGroupItem: React.FC<ActivityGroupItemProps> = ({
  group,
  isHovered,
  mouseEvents,
  weeks,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [ref, isRowHovered] = useHover<HTMLTableRowElement>();

  return (
    <>
      <tr
        className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        ref={ref}
      >
        <td
          className={`sticky z-10 left-0 ${isRowHovered ? 'bg-gray-100' : 'bg-gray-50'}`}
        >
          <div
            className="grid grid-cols-2 items-center gap-2 p-2 ml-8 border-r border-gray-300"
            style={{ gridTemplateColumns: '25px 1fr' }}
          >
            <div>
              <span className="text-lg bg-gray-700 px-1 text-white font-semibold rounded-md">
                {isExpanded ? (
                  <Minus className="w-4 -mt-1 inline-block" />
                ) : (
                  <Plus className="w-4 -mt-1 inline-block" />
                )}
              </span>
            </div>
            <span>
              {group.groupName}
              <span className="pl-2 text-xs text-gray-600">
                {` ${group.groupTasks} of ${group.totalTasks}`}
              </span>
            </span>
          </div>
        </td>
        {group.rolledUpByWeek.map(({ state, count }, index) => (
          <td
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={`text-center ${
              isHovered(index)
                ? weeks[index].highlight
                  ? 'bg-blue-200'
                  : 'bg-gray-100'
                : weeks[index].highlight
                ? 'bg-blue-100'
                : ''
            }`}
            {...mouseEvents(index)}
            data-tooltip-id="react-tooltip"
            data-tooltip-html={rollupTooltip(
              group.subgroups
                .flatMap(s => s.tasks)
                .filter(t => t.weekIndex === index)
                .map(t => t.task),
              weeks[index]
            )}
          >
            <span
              className={`px-2 py-1 rounded-lg text-sm border-2 font-semibold border-transparent ${styleForState(
                state
              )}`}
            >
              {count === 0 ? ' ' : count}
            </span>
          </td>
        ))}
      </tr>
      {isExpanded &&
        group.subgroups.map(subgroup => (
          <ActivitySubGroup
            key={subgroup.subgroupName}
            subgroup={subgroup}
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={weeks}
          />
        ))}
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
  isExpanded: boolean;
  toggleExpand: () => void;
  counters: string;
};

const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  weeks,
  isHovered,
  mouseEvents,
  isExpanded,
  toggleExpand,
  counters,
}) => (
  <tr>
    <th className="text-left sticky z-10 left-0 bg-gray-50" style={{ width: '700px' }}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <div
        className="grid grid-cols-2 items-center gap-2 p-2 mt-16 mb-2"
        style={{ gridTemplateColumns: '25px 1fr' }}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
      >
        <span className="inline-block bg-gray-700 px-1 text-white font-semibold rounded-md">
          {isExpanded ? (
            <Minus className="w-4 -mt-1 inline-block" />
          ) : (
            <Plus className="w-4 -mt-1 inline-block" />
          )}
        </span>
        <h2 className="text-xl font-semibold">
          {title}
          <span className="text-xs text-gray-600 font-normal pl-2">{counters}</span>
        </h2>
      </div>
    </th>
    {weeks.map((week, weekIndex) => (
      <th key={week.label} className="text-center" {...mouseEvents(weekIndex)}>
        <div className="relative">
          {isExpanded ? (
            <div className="absolute -bottom-16 -ml-2 text-left origin-top-left pl-2 w-32 -rotate-45 text-xs font-normal text-gray-600">
              <span
                className={`p-1 rounded-md ${
                  week.highlight ? 'bg-blue-200 text-blue-800' : ''
                } ${isHovered(weekIndex) ? 'font-semibold' : ''}`}
              >
                {week.label}
              </span>
            </div>
          ) : null}
        </div>
      </th>
    ))}
  </tr>
);

const GroupedListing: React.FC<{ groups: OrganizedTasks }> = ({ groups }) => {
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const [expandPlanned, setExpandPlanned] = useState(false);
  const [expandUnplanned, setExpandUnplanned] = useState(false);

  const mouseEvents = useCallback(
    (weekIndex: number) => ({
      onMouseOver: () => setHoveredWeekIndex(weekIndex),
      onMouseOut: () => setHoveredWeekIndex(null),
    }),
    []
  );

  const isHovered = (weekIndex: number) => hoveredWeekIndex === weekIndex;

  return (
    <div className="overflow-x-scroll">
      <table className="w-max">
        <tbody>
          <TableHeader
            title="Planned activities"
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={groups.weeks}
            isExpanded={expandPlanned}
            toggleExpand={() => setExpandPlanned(not)}
            counters={`${count<(typeof groups.planned)[number]>(
              incrementBy(prop('groupTasks'))
            )(groups.planned)} of ${count<(typeof groups.planned)[number]>(
              incrementBy(prop('totalTasks'))
            )(groups.planned)}`}
          />
          {expandPlanned &&
            groups.planned.map(group => (
              <ActivityGroupItem
                key={group.groupName}
                group={group}
                isHovered={isHovered}
                mouseEvents={mouseEvents}
                weeks={groups.weeks}
              />
            ))}
          <TableHeader
            title="Unplanned activities"
            isHovered={isHovered}
            mouseEvents={mouseEvents}
            weeks={groups.weeks}
            isExpanded={expandUnplanned}
            toggleExpand={() => setExpandUnplanned(not)}
            counters={`${count<(typeof groups.planned)[number]>(
              incrementBy(prop('groupTasks'))
            )(groups.unplanned)} of ${count<(typeof groups.planned)[number]>(
              incrementBy(prop('totalTasks'))
            )(groups.unplanned)}`}
          />
          {expandUnplanned &&
            groups.unplanned.map(group => (
              <ActivityGroupItem
                key={group.groupName}
                group={group}
                isHovered={isHovered}
                mouseEvents={mouseEvents}
                weeks={groups.weeks}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupedListing;
