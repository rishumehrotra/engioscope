import React from 'react';
import { Link } from 'react-router-dom';
import { asc, byString } from 'sort-lib';
import { identity } from 'rambda';
import { trpc } from '../helpers/trpc.js';

const Project: React.FC<{
  projectName: string;
  route: string;
}> = ({ projectName, route }) => (
  <Link
    to={route}
    key={route}
    title={projectName}
    className={[
      'grid grid-flow-col justify-start group link-text py-3 px-4',
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

const CollectionProjectsGrid: React.FC<{
  collectionName: string;
}> = ({ collectionName }) => {
  const projectsList = trpc.collections.collectionProjects.useQuery({ collectionName });

  if (!projectsList.data) return null;

  return (
    <div className="border border-gray-300 bg-gray-100 rounded-b-lg grid grid-flow-row grid-cols-4 gap-2 p-4 ml-4">
      {projectsList.data.sort(asc(byString(identity))).map(project => (
        <Project
          key={project}
          projectName={project}
          route={`/${collectionName}/${project}/`}
        />
      ))}
    </div>
  );
};

export default CollectionProjectsGrid;
