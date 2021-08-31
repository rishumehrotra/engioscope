import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ScrapedProject } from '../../shared/types';
import Header from '../components/Header';
import Loading from '../components/Loading';
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

  return (
    <div>
      <div>
        <Header
          lastUpdated={collections ? collections[0].lastUpdated : ''}
          title="Projects"
        />
        <div className="mx-32 -mt-24 bg-gray-50 p-8 rounded-lg">
          <div className="grid grid-flow-row gap-8 grid-col-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {
              collections
                ? collections.map(collection => (
                  <Project
                    key={collection.name[1]}
                    projectName={collection.name[1]}
                    route={`/${collection.name.join('/')}/repos`}
                    collectionName={collection.name[0]}
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    lastUpdated={collection.lastUpdated!}
                  />
                ))
                : <Loading />
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collection;

