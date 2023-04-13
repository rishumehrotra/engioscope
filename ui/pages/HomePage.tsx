import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../helpers/trpc.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { useSetProjectDetails } from '../hooks/project-details-hooks.js';
import CollectionProjectsGrid from '../components/CollectionProjectsGrid';
import SearchCombobox from '../components/SearchCombobox.jsx';

const HomePage: React.FC = () => {
  const setProjectDetails = useSetProjectDetails();
  const setHeaderDetails = useSetHeaderDetails();
  const [showCollections, setShowCollections] = useState(false);
  const navigate = useNavigate();
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
    setProjectDetails(null);
  }, [setProjectDetails]);

  useEffect(() => {
    setHeaderDetails({ title: 'Projects' });
  }, [setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      <div>
        <SearchCombobox />
        <details>
          <summary
            onClick={() => setShowCollections(true)}
            className="cursor-pointer hover:text-blue-600 hover:underline"
          >
            Browse collections
          </summary>
          {(collectionList.data || []).map(collection => (
            <details
              className="my-1 ml-4"
              key={collection.name}
              onToggle={handleCollectionToggle(collection.name)}
            >
              <summary className="cursor-pointer hover:text-blue-600 hover:underline group">
                {`${collection.name} `}
                <span className="text-gray-600 group-hover:text-blue-600">
                  ({collection.projectsCount} projects)
                </span>
              </summary>
              <button
                className="bg-slate-900 -50 px-6 py-4 rounded-t-lg text-white font-semibold mt-4 ml-4 w-full text-left"
                onClick={() => {
                  navigate(`/${collection.name}`);
                }}
              >
                {collection.name}
                <span className="text-gray-400">{` (${collection.projectsCount} projects)`}</span>
              </button>
              {openedCollections.includes(collection.name) ? (
                <CollectionProjectsGrid collectionName={collection.name} />
              ) : null}
            </details>
          ))}
        </details>
      </div>
    </div>
  );
};

export default HomePage;
