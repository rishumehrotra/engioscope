import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asc, byString } from 'sort-lib';
import type { AnalysedProjects, ScrapedProject } from '../../shared/types.js';
import Loading from '../components/Loading.js';
import { trpc } from '../helpers/trpc.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';
import useQueryParam, { asBoolean } from '../hooks/use-query-param.js';
import { fetchCollections } from '../network.js';
import CollectionProjectsGrid from '../components/CollectionProjectsGrid';
import SearchCombobox from '../components/search-ui/SearchCombobox.jsx';

const Project: React.FC<{
  projectName: string;
  route: string;
}> = ({ projectName, route }) => (
  <Link
    to={route}
    key={route}
    title={projectName}
    className={[
      'grid grid-flow-col justify-start group link-text text-lg py-3 px-4',
      'hover:bg-gray-200 rounded-xl hover:no-underline border border-transparent',
      'hover:border-gray-300',
    ].join(' ')}
  >
    <span
      className={[
        'inline-grid self-center bg-gray-400 w-8 text-center rounded-lg mr-2 text-white',
        'group-hover:bg-gray-900 font-semibold',
      ].join(' ')}
    >
      {projectName.charAt(0).toUpperCase()}
    </span>
    <span className="truncate w-full inline-block">{projectName}</span>
  </Link>
);

const Collection: React.FC = () => {
  const [analysedProjects, setAnalysedProjects] = useState<
    AnalysedProjects | undefined
  >();
  const setProjectDetails = useSetProjectDetails();
  const setHeaderDetails = useSetHeaderDetails();
  const [showSearchBox] = useQueryParam('search-box', asBoolean);
  const [showCollections, setShowCollections] = useState(false);

  const [openedCollections, setOpenedCollections] = useState<string[]>([]);

  const collectionList = trpc.collections.allCollections.useQuery(undefined, {
    enabled: showCollections,
  });

  const handleCollectionToggle = useCallback(
    (collectionName: string) => () => {
      if (openedCollections.includes(collectionName)) {
        setOpenedCollections(openedCollections.filter(c => c !== collectionName));
      } else {
        setOpenedCollections([...openedCollections, collectionName]);
      }
    },
    [openedCollections]
  );
  useEffect(() => {
    // TODO: Error handling
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchCollections().then(setAnalysedProjects);
  }, []);

  useEffect(() => {
    setProjectDetails(null);
  }, [setProjectDetails]);

  useEffect(() => {
    setHeaderDetails({ title: 'Projects', lastUpdated: analysedProjects?.lastUpdated });
  }, [analysedProjects, setHeaderDetails]);

  const grouped = useMemo(() => {
    if (!analysedProjects) return null;

    return Object.entries(
      analysedProjects.projects.reduce<Record<string, ScrapedProject[]>>((acc, p) => {
        acc[p.name[0]] = acc[p.name[0]] || [];
        acc[p.name[0]].push(p);
        return acc;
      }, {})
    );
  }, [analysedProjects]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      <div>
        {showSearchBox && <SearchCombobox />}
        {showSearchBox ? (
          <details>
            <summary onClick={() => setShowCollections(true)} className="cursor-pointer">
              Browse collections
            </summary>
            {(collectionList.data || []).map(collection => (
              <details
                className="my-1 ml-4"
                key={collection.name}
                onToggle={handleCollectionToggle(collection.name)}
              >
                <summary className="cursor-pointer">
                  {`${collection.name} `}
                  <span className="text-gray-600">
                    ({collection.projectsCount} projects)
                  </span>
                </summary>
                <h2 className="bg-slate-900 -50 px-6 py-4 rounded-t-lg text-white font-semibold text-2xl mt-4">
                  {collection.name}
                  <span className="text-gray-400">{` (${collection.projectsCount} projects)`}</span>
                </h2>
                {openedCollections.includes(collection.name) ? (
                  <CollectionProjectsGrid collectionName={collection.name} />
                ) : null}
              </details>
            ))}
          </details>
        ) : grouped ? (
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
        ) : (
          <Loading />
        )}
      </div>
    </div>
  );
};

export default Collection;
