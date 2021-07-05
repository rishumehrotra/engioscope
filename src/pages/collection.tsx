import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrapedProject } from '../../shared-types';
import { getRatingColor } from '../helpers';

const Project: React.FC<{
  projectName: string,
  route: string,
  rating: number,
  lastUpdated: string
}> = ({
  projectName, route, rating, lastUpdated
}) => (
  <Link to={route}>
    <div className="flex flex-col justify-center p-8 bg-white border border-gray-300 rounded-lg">
      <p
        className={`text-4xl font-semibold text-center text-${getRatingColor(rating)}`}
      >
        {rating}
      </p>
      <p className="text-4xl text-center text-gray-800">{projectName}</p>
      <div className="italic text-sm flex justify-center w-full mt-4 text-gray-600">
        {`Last updated on: ${lastUpdated}`}
      </div>
    </div>
  </Link>
);

const fetchCollections = () => fetch('/data/index.json').then(res => res.json());

const Collection: React.FC = () => {
  const [collections, setCollections] = useState<ScrapedProject[] | undefined>();
  useEffect(() => { fetchCollections().then(setCollections); }, []);

  if (!collections) return <div>loading...</div>;

  return (
    <div className="text-5xl">
      <div className="mt-32 grid grid-flow-row gap-16 grid-cols-3">
        {collections.map(collection => (
          <Project
            key={collection.name[1]}
            projectName={collection.name[1]}
            route={`/${collection.name.join('/')}`}
            rating={collection.rating}
            lastUpdated={collection.lastUpdated}
          />
        ))}
      </div>
    </div>
  );
};

export default Collection;
