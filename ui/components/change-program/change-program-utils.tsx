import {
  add, allPass, compose, identity, length, not, pipe, prop, range, uniq
} from 'rambda';
import { count, incrementBy } from '../../../shared/reducer-utils';
import { asc, byString } from '../../../shared/sort-utils';
import type { UIChangeProgram, UIChangeProgramTask } from '../../../shared/types';
import { shortDate } from '../../helpers/utils';

export type ListingType = 'planned' | 'unplanned';

const taskState = (referenceDate: Date) => (task: UIChangeProgramTask) => {
  if (!task.plannedCompletion) return 'unplanned';
  if (!task.actualCompletion) {
    if (new Date(task.plannedCompletion) < referenceDate) return 'overdue';
    return 'planned';
  }
  if (new Date(task.actualCompletion) <= new Date(task.plannedCompletion)) return 'completed-on-time';
  return 'completed-late';
};

export type TaskState = ReturnType<ReturnType<typeof taskState>>;
export type RollupTaskState = TaskState | 'no-tasks';

const rollUpTaskStates = (states: TaskState[]): RollupTaskState => {
  if (states.length === 0) return 'no-tasks';
  if (states.every(state => state === 'unplanned')) return 'unplanned';
  if (states.every(state => state === 'planned')) return 'planned';
  if (states.every(state => state === 'completed-on-time')) return 'completed-on-time';
  if (states.some(state => state === 'overdue')) return 'overdue';
  return 'completed-late';
};

const rollUpGroupStates = (states: RollupTaskState[]) => {
  if (states.every(state => state === 'no-tasks')) return 'no-tasks';
  return rollUpTaskStates(uniq(states).filter(state => state !== 'no-tasks') as TaskState[]);
};

export const taskTooltip = (task: UIChangeProgramTask) => {
  const showStatus = (className: string, label: string) => `
  <div class="flex items-center">
    <span class="${className} inline-block w-3 h-3 rounded-sm"> </span>
    <span class="pl-2">
      ${label}
    </span>
  </div>
  `;

  return `
  <div class="w-64">
    ${task.id}: <strong>${task.title}</strong><br />
    Status: <strong>${task.state}</strong><br />
    ${task.plannedStart ? `Planned start: <strong>${shortDate(new Date(task.plannedStart))}</strong><br />` : ''}
    ${task.actualStart ? `Actual start: <strong>${shortDate(new Date(task.actualStart))}</strong><br />` : ''}
    ${task.plannedCompletion ? `Planned completion: <strong>${shortDate(new Date(task.plannedCompletion))}</strong><br />` : ''}
    ${task.actualCompletion ? `Actual completion: <strong>${shortDate(new Date(task.actualCompletion))}</strong><br />` : ''}
    ${(() => {
    switch (taskState(new Date())(task)) {
      case 'completed-on-time': return showStatus('bg-green-600', 'Completed on time');
      case 'completed-late': return showStatus('bg-orange-600', 'Completed, delayed');
      case 'overdue': return showStatus('bg-red-600', 'Overdue');
      case 'planned': return showStatus('bg-gray-600', 'Planned');
      default: return showStatus('bg-gray-600', 'Unplanned');
      // case 'completed-on-time': return '<span class="text-green-400">Completed on time</span>';
      // case 'completed-late': return '<span class="text-orange-400">Completed, delayed</span>';
      // case 'planned': return '<span class="text-gray-400">Planned</span>';
      // case 'overdue': return '<span class="text-red-400">Overdue</span>';
      // default: return '<span class="text-gray-400">Unplanned</span>';
    }
  })()}
  </div>
`;
};

export const rollupTooltip = (tasks: UIChangeProgramTask[], week: OrganizedTasks['weeks'][number]) => {
  const states = tasks.map(task => taskState(new Date())(task));
  const getCountOf = (state: TaskState) => states.filter(s => s === state).length;
  const overdueCount = getCountOf('overdue');
  const completedLateCount = getCountOf('completed-late');
  const completedOnTimeCount = getCountOf('completed-on-time');
  const plannedCount = getCountOf('planned');
  const unplannedCount = getCountOf('unplanned');

  const showCount = (count: number, label: string, className: string) => (
    count !== 0
      ? (`
        <div class="flex items-center">
          <span class="${className} inline-block w-3 h-3 rounded-sm"> </span>
          <span class="pl-2">
            <strong>${count}</strong> ${count === 1 ? 'task' : 'tasks'} ${label}
          </span>
        </div>
      `)
      : ''
  );

  return `
    Week: <strong>${week.label}</strong><br />
    ${showCount(overdueCount, 'overdue', 'bg-red-600')}
    ${showCount(completedLateCount, 'completed late', 'bg-orange-500')}
    ${showCount(completedOnTimeCount, 'completed on time', 'bg-green-500')}
    ${showCount(plannedCount, 'planned', 'bg-gray-500')}
    ${showCount(unplannedCount, 'unplanned', 'bg-gray-500')}
  `;
};

export const taskClassName = (
  details: NonNullable<UIChangeProgram['details']>, task: UIChangeProgramTask
) => {
  if (task.state === details.startedState) {
    return 'border-2 border-green-600';
  }

  if (task.state === details.doneState) {
    return 'border-2 border-green-600 bg-green-600';
  }

  // New
  return 'border-2 border-slate-300 bg-slate-300';
};

const isInWeekStarting = (weekStart: Date, date: Date) => {
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  return date >= weekStartDate && date < weekEndDate;
};

const getWeekStarting = (date: Date, referenceDate: Date, deltaWeeks = 1): Date => {
  const pastWeekStartDate = new Date(referenceDate);
  pastWeekStartDate.setDate(pastWeekStartDate.getDate() - (deltaWeeks * 7));

  if (isInWeekStarting(pastWeekStartDate, date)) return pastWeekStartDate;

  const futureWeekStartDate = new Date(referenceDate);
  futureWeekStartDate.setDate(futureWeekStartDate.getDate() + ((deltaWeeks - 1) * 7));

  if (isInWeekStarting(futureWeekStartDate, date)) return futureWeekStartDate;

  return getWeekStarting(date, referenceDate, deltaWeeks + 1);
};

export const organizeTasksByWeek = (
  dateFromTask: (task: UIChangeProgramTask) => Date,
  tasks: UIChangeProgramTask[],
  referenceDate = new Date()
) => (
  tasks
    .reduce<Record<string, UIChangeProgramTask[]>>((acc, task) => {
      const weekStart = getWeekStarting(dateFromTask(task), referenceDate);

      acc[weekStart.toISOString()] = acc[weekStart.toISOString()] || [];
      acc[weekStart.toISOString()].push(task);

      return acc;
    }, {})
);

const isOfTeam = (teamName: string) => (task: UIChangeProgramTask) => task.team === teamName;
const isOfTheme = (themeName: string) => (task: UIChangeProgramTask) => task.theme === themeName;
const isPlanned = (task: UIChangeProgramTask) => task.plannedCompletion !== undefined;
const isOfType = (listingType: ListingType) => (
  compose(listingType === 'planned' ? identity : not, isPlanned)
);

export const organizeBy = (type: 'theme' | 'team') => (tasks: UIChangeProgramTask[]) => {
  const today = new Date();

  const tasksByWeek = Object.fromEntries(
    Object.entries(
      organizeTasksByWeek(
        task => new Date(task.plannedCompletion ?? task.created.on), tasks, today
      )
    ).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  );

  const teams = uniq(tasks.map(prop('team'))).sort(asc(byString(identity)));
  const themes = uniq(tasks.map(prop('theme'))).sort(asc(byString(identity)));

  const [firstGroup, secondGroup] = type === 'theme' ? [themes, teams] : [teams, themes];

  const taskStateToday = taskState(today);

  const createGroupingWith = (listingType: ListingType) => {
    const splitByGroups = firstGroup.map(groupName => ({
      groupName,
      subgroups: secondGroup.map(subgroupName => {
        const applicableTasksFilter = allPass([
          isOfTeam(type === 'theme' ? subgroupName : groupName),
          isOfTheme(type === 'theme' ? groupName : subgroupName),
          isOfType(listingType)
        ]);

        return {
          subgroupName,
          totalTasks: tasks.filter(allPass([
            isOfTeam(type === 'theme' ? subgroupName : groupName),
            isOfTheme(type === 'theme' ? groupName : subgroupName)
          ])).length,
          tasks: Object.entries(tasksByWeek)
            .flatMap(([weekStart, tasks], weekIndex) => {
              const applicableTasks = tasks.filter(applicableTasksFilter);
              return (
                applicableTasks
                  .map(task => ({
                    task,
                    weekIndex,
                    weekStart,
                    weekCount: Object.keys(tasksByWeek).length,
                    status: taskStateToday(task) as TaskState
                  }))
              );
            }),
          rolledUpByWeek: Object.values(tasksByWeek)
            .map(tasks => {
              const applicableTasks = tasks.filter(applicableTasksFilter);
              return {
                state: rollUpTaskStates(applicableTasks.map(taskStateToday)) as RollupTaskState,
                count: applicableTasks.length
              };
            })
        };
      })
    }));

    return splitByGroups
      .map(group => ({
        ...group,
        totalTasks: count<(typeof group.subgroups)[number]>(incrementBy(prop('totalTasks')))(group.subgroups),
        groupTasks: count<(typeof group.subgroups)[number]>(incrementBy(pipe(prop('tasks'), length)))(group.subgroups),
        rolledUpByWeek: range(0, Object.keys(tasksByWeek).length)
          .map(weekIndex => ({
            state: rollUpGroupStates(
              group.subgroups.map(subgroup => subgroup.rolledUpByWeek[weekIndex].state)
            ) as RollupTaskState,
            count: group.subgroups
              .map(subgroup => subgroup.rolledUpByWeek[weekIndex].count)
              .reduce(add, 0)
          }))
      }));
  };

  return {
    planned: createGroupingWith('planned'),
    unplanned: createGroupingWith('unplanned'),
    weeks: Object.keys(tasksByWeek)
      .map(weekStartString => {
        const weekStart = new Date(weekStartString);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return {
          label: `${shortDate(new Date(weekStart))} - ${shortDate(weekEnd)}`,
          highlight: today >= weekStart && today < weekEnd
        };
      })
  };
};

export type OrganizedTasks = ReturnType<ReturnType<typeof organizeBy>>;

export const organizeByTheme = organizeBy('theme');
export const organizeByTeam = organizeBy('team');
