import React, { useMemo } from 'react';
import { asc, byString } from '../../../shared/sort-utils';
import type { UIChangeProgram, UIChangeProgramTask } from '../../../shared/types';

const tooltip = (task: UIChangeProgramTask) => `
  <div class="w-64">
    <strong>${task.title}</strong><br />
    Status: <strong>${task.state}</strong><br />
  </div>
`;

const taskClassName = (task: UIChangeProgramTask) => {
  if (task.state === 'New') {
    return 'border-2 border-slate-600';
  }

  if (task.state === 'In Progress') {
    return 'border-2 border-green-600';
  }

  if (task.state === 'Live') {
    return 'border-2 border-green-600 bg-green-600';
  }

  return '';
};

const ByTeam: React.FC<{ changeProgramDetails: NonNullable<UIChangeProgram['details']> }> = ({ changeProgramDetails }) => {
  const byTeam = useMemo(() => (
    changeProgramDetails.tasks.reduce<Record<string, Record<string, UIChangeProgramTask[]>>>((acc, task) => {
      acc[task.team] = acc[task.team] || {};
      acc[task.team][task.theme] = acc[task.team][task.theme] || [];
      acc[task.team][task.theme].push(task);
      return acc;
    }, {})
  ), [changeProgramDetails.tasks]);

  return (
    <>
      {Object.entries(byTeam)
        .sort(asc(byString(([teamName]) => teamName)))
        .map(([teamName, themes]) => (
          <details key={teamName}>
            <summary className="ml-2 text-xl cursor-pointer mt-2">{teamName}</summary>

            <table className="ml-6 w-full">
              <tbody>
                {Object.entries(themes)
                  .sort(asc(byString(([themeName]) => themeName)))
                  .map(([themeName, tasks]) => (
                    <tr key={themeName} className="hover:bg-gray-100">
                      <td className="text-lg pr-4 py-1 w-96">{themeName}</td>

                      <td>
                        <ul className="flex gap-1">
                          {tasks.map(task => (
                            <li
                              key={task.id}
                              className=""
                              data-tip={tooltip(task)}
                              data-html
                            >
                              <a
                                href={task.url}
                                className={`w-4 h-4 rounded-full block ${taskClassName(task)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {' '}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </details>
        ))}
    </>
  );
};

export default ByTeam;
