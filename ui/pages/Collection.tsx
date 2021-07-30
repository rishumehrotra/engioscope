import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrapedProject } from '../../shared/types';
import { fetchCollections } from '../network';

const Project: React.FC<{
  projectName: string;
  route: string;
  lastUpdated: string;
}> = ({
  projectName, route, lastUpdated
}) => (
  <Link to={route}>
    <div className="flex flex-col justify-center p-8 bg-white border border-gray-100 rounded-lg h-full shadow">
      <p className="overflow-ellipsis overflow-hidden ... text-3xl text-center font-semibold text-gray-700">{projectName}</p>
      <div className="italic text-sm flex justify-center w-full mt-4 text-gray-600">
        {`Last updated on: ${lastUpdated}`}
      </div>
    </div>
  </Link>
);

const Collection: React.FC = () => {
  const [collections, setCollections] = useState<ScrapedProject[] | undefined>();
  useEffect(() => { fetchCollections().then(setCollections); }, []);

  if (!collections) return <div>loading...</div>;

  return (
    <div className="text-5xl">
      <div className="mt-32 grid grid-flow-row gap-16 grid-col-1 md:grid-cols-2 lg:grid-cols-3  auto-rows-fr">
        {collections.map(collection => (
          <Project
            key={collection.name[1]}
            projectName={collection.name[1]}
            route={`/${collection.name.join('/')}/repos`}
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            lastUpdated={collection.lastUpdated!}
          />
        ))}
      </div>
    </div>
  );
};

export default Collection;
