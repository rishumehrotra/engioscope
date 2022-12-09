import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asc, byString } from 'sort-lib';
import type { AnalysedProjects, ScrapedProject } from '../../shared/types.js';
import Loading from '../components/Loading.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';
import { fetchCollections } from '../network.js';

const Project: React.FC<{
  projectName: string;
  route: string;
}> = ({
  projectName, route
}) => (
  <Link
    to={route}
    key={route}
    title={projectName}
    className={[
      'grid grid-flow-col justify-start group link-text text-lg py-3 px-4',
      'hover:bg-gray-200 rounded-xl hover:no-underline border border-transparent',
      'hover:border-gray-300'
    ].join(' ')}
  >
    <span
      className={[
        'inline-grid self-center bg-gray-400 w-8 text-center rounded-lg mr-2 text-white',
        'group-hover:bg-gray-900 font-semibold'
      ].join(' ')}
    >
      {projectName.charAt(0).toUpperCase()}
    </span>
    <span className="truncate w-full inline-block">
      {projectName}
    </span>
  </Link>
);

const Collection: React.FC = () => {
  const [analysedProjects, setAnalysedProjects] = useState<AnalysedProjects | undefined>();
  const setProjectDetails = useSetProjectDetails();
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    // TODO: Error handling
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchCollections().then(setAnalysedProjects);
  }, []);
  useEffect(() => { setProjectDetails(null); }, [setProjectDetails]);
  useEffect(() => {
    setHeaderDetails({ title: 'Projects', lastUpdated: analysedProjects?.lastUpdated });
  }, [analysedProjects, setHeaderDetails]);

  const grouped = useMemo(() => {
    if (!analysedProjects) return null;

    return Object.entries(analysedProjects.projects.reduce<Record<string, ScrapedProject[]>>((acc, p) => {
      acc[p.name[0]] = acc[p.name[0]] || [];
      acc[p.name[0]].push(p);
      return acc;
    }, {}));
  }, [analysedProjects]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      {
        grouped
          ? (
            grouped.map(([collection, projects]) => (
              <div
                key={collection}
                className="bg-gray-100 mb-14 rounded-xl border border-gray-300 overflow-hidden"
              >
                <h2 className="text-2xl px-6 py-4 font-semibold bg-gray-900 text-white">
                  {collection}
                  <span className="inline-block pl-4 text-base text-gray-400 pb-2">{`${projects.length} projects`}</span>
                </h2>
                <div className="grid grid-flow-row grid-cols-3 gap-4 p-10">
                  {projects.sort(asc(byString(p => p.name[1]))).map(p => (
                    <Project
                      key={p.name[1]}
                      projectName={p.name[1]}
                      route={`/${p.name.join('/')}/`}
                    />
                  ))}
                </div>
              </div>
            ))
          )
          : <Loading />
      }
    </div>
  );
};

export default Collection;

