import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrapedProject } from '../../shared/types';
import { useSetProjectDetails } from '../hooks/project-details-hooks';
import { fetchCollections } from '../network';

const Project: React.FC<{
  projectName: string;
  route: string;
  lastUpdated: string;
  collectionName: string;
}> = ({
  projectName, route, collectionName
}) => (
  <Link to={route}>
    <div className="flex flex-col justify-center p-8 bg-white border border-gray-100 rounded-lg h-full shadow">
      <p className="overflow-ellipsis overflow-hidden ... text-2xl text-center font-semibold text-gray-700">{projectName}</p>
      <div className="text-sm flex justify-center w-full mt-4 text-gray-600">
        {collectionName}
      </div>
    </div>
  </Link>
);

const Collection: React.FC = () => {
  const [collections, setCollections] = useState<ScrapedProject[] | undefined>();
  const setProjectDetails = useSetProjectDetails();

  useEffect(() => { fetchCollections().then(setCollections); }, []);
  useEffect(() => { setProjectDetails(null); }, [setProjectDetails]);

  if (!collections) return <div>loading...</div>;

  return (
    <div>
      <div className="text-sm text-gray-500 -mt-7 flex justify-end">
        Last updated on
        <span className="font-semibold text-gray-600 ml-1">
          {collections[0].lastUpdated}
        </span>
      </div>
      <h1 className="mt-16 mb-8 text-3xl font-semibold text-gray-800">Projects</h1>
      <div className="grid grid-flow-row gap-8 grid-col-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {collections.map(collection => (
          <Project
            key={collection.name[1]}
            projectName={collection.name[1]}
            route={`/${collection.name.join('/')}/repos`}
            collectionName={collection.name[0]}
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            lastUpdated={collection.lastUpdated!}
          />
        ))}
      </div>
    </div>
  );
};

export default Collection;
