import {
  add, allPass, identity, prop, range, uniq
} from 'rambda';
import { asc, byString } from '../../../shared/sort-utils';
import type { UIChangeProgram, UIChangeProgramTask } from '../../../shared/types';
import { shortDate } from '../../helpers/utils';

export const tooltip = (task: UIChangeProgramTask) => `
  <div class="w-64">
    <strong>${task.title}</strong><br />
    Status: <strong>${task.state}</strong><br />
    ${task.plannedStart ? `Planned start: <strong>${shortDate(new Date(task.plannedStart))}</strong><br />` : ''}
    ${task.actualStart ? `Actual start: <strong>${shortDate(new Date(task.actualStart))}</strong><br />` : ''}
    ${task.plannedCompletion ? `Planned completion: <strong>${shortDate(new Date(task.plannedCompletion))}</strong><br />` : ''}
    ${task.actualCompletion ? `Actual completion: <strong>${shortDate(new Date(task.actualCompletion))}</strong><br />` : ''}
  </div>
`;
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

export const organizeTasksByWeek = (dateFromTask: (task: UIChangeProgramTask) => Date) => (
  (tasks: UIChangeProgramTask[], referenceDate = new Date()) => (
    tasks
      .reduce<Record<string, UIChangeProgramTask[]>>((acc, task) => {
        const weekStart = getWeekStarting(dateFromTask(task), referenceDate);

        acc[weekStart.toISOString()] = acc[weekStart.toISOString()] || [];
        acc[weekStart.toISOString()].push(task);

        return acc;
      }, {})
  )
);

const isOfTeam = (teamName: string) => (task: UIChangeProgramTask) => task.team === teamName;
const isOfTheme = (themeName: string) => (task: UIChangeProgramTask) => task.theme === themeName;

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
  if (states.every(state => state === 'overdue')) return 'overdue';
  if (states.every(state => state === 'completed-on-time')) return 'completed-on-time';
  return 'completed-late';
};

const rollUpGroupStates = (states: RollupTaskState[]) => {
  if (states.every(state => state === 'no-tasks')) return 'no-tasks';
  return rollUpTaskStates(uniq(states).filter(state => state !== 'no-tasks') as TaskState[]);
};

export const organizeBy = (type: 'theme' | 'team') => (tasks: UIChangeProgramTask[]) => {
  const today = new Date();

  const plannedTasksByWeek = Object.fromEntries(
    Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      organizeTasksByWeek(task => new Date(task.plannedCompletion!))(
        tasks.filter(task => task.plannedCompletion),
        today
      )
    ).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
  );

  const unplannedTasksByCreateDate = organizeTasksByWeek(task => new Date(task.created.on))(
    tasks.filter(task => !task.plannedCompletion),
    today
  );

  const teams = uniq(tasks.map(prop('team'))).sort(asc(byString(identity)));
  const themes = uniq(tasks.map(prop('theme'))).sort(asc(byString(identity)));

  const [firstGroup, secondGroup] = type === 'theme' ? [themes, teams] : [teams, themes];
  const taskStateToday = taskState(today);

  const createGroupingWith = (grouped: Record<string, UIChangeProgramTask[]>) => {
    const splitByGroups = firstGroup.map(groupName => ({
      groupName,
      subgroups: secondGroup.map(subgroupName => {
        const applicableTasksFilter = allPass([
          isOfTeam(type === 'theme' ? subgroupName : groupName),
          isOfTheme(type === 'theme' ? groupName : subgroupName)
        ]);

        return {
          subgroupName,
          tasks: Object.entries(grouped)
            .flatMap(([weekStart, tasks], weekIndex) => {
              const applicableTasks = tasks.filter(applicableTasksFilter);
              return (
                applicableTasks
                  .map(task => ({
                    task,
                    weekIndex,
                    weekStart,
                    weekCount: Object.keys(grouped).length,
                    status: taskStateToday(task) as TaskState
                  }))
              );
            }),
          rolledUpByWeek: Object.values(grouped)
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

    return {
      groups: splitByGroups
        .map(group => ({
          ...group,
          rolledUpByWeek: range(0, Object.keys(grouped).length)
            .map(weekIndex => ({
              state: rollUpGroupStates(
                group.subgroups.map(subgroup => subgroup.rolledUpByWeek[weekIndex].state)
              ) as RollupTaskState,
              count: group.subgroups
                .map(subgroup => subgroup.rolledUpByWeek[weekIndex].count)
                .reduce(add, 0)
            }))
        })),
      weeks: Object.keys(grouped)
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

  return {
    planned: createGroupingWith(plannedTasksByWeek),
    unplanned: createGroupingWith(unplannedTasksByCreateDate)
  };
};

export const organizeByTheme = organizeBy('theme');
export const organizeByTeam = organizeBy('team');
