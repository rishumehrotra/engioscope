import type { UIChangeProgram, UIChangeProgramTask } from '../../../shared/types';

export const tooltip = (task: UIChangeProgramTask) => `
  <div class="w-64">
    <strong>${task.title}</strong><br />
    Status: <strong>${task.state}</strong><br />
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
