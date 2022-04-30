import React, { useMemo } from 'react';
import { asc, byString } from '../../../shared/sort-utils';
import type { UIChangeProgram, UIChangeProgramTask } from '../../../shared/types';

const tooltip = (task: UIChangeProgramTask) => `
  <div class="w-64">
    <strong>${task.title}</strong>
  </div>
`;

const ByTheme: React.FC<{ changeProgram: UIChangeProgram }> = ({ changeProgram }) => {
  const byTheme = useMemo(() => (
    changeProgram.changeProgramTasks.reduce<Record<string, Record<string, UIChangeProgramTask[]>>>((acc, task) => {
      acc[task.theme] = acc[task.theme] || {};
      acc[task.theme][task.team] = acc[task.theme][task.team] || [];
      acc[task.theme][task.team].push(task);
      return acc;
    }, {})
  ), [changeProgram.changeProgramTasks]);

  return (
    <>
      {Object.entries(byTheme)
        .sort(asc(byString(([themeName]) => themeName)))
        .map(([themeName, teams]) => (
          <details key={themeName}>
            <summary className="ml-2 text-xl cursor-pointer mt-2">{themeName}</summary>

            <div className="grid grid-cols-2 ml-6">
              {Object.entries(teams)
                .sort(asc(byString(([teamName]) => teamName)))
                .map(([teamName, tasks]) => (
                  <React.Fragment key={teamName}>
                    <div className="text-lg">{teamName}</div>

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
                            className="w-4 h-4 rounded-full bg-slate-600 block"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {' '}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </React.Fragment>
                ))}
            </div>
          </details>
        ))}
    </>
  );
};

export default ByTheme;
