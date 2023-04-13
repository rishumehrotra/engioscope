import React, { useCallback, useState } from 'react';
import { trpc } from '../../helpers/trpc.js';
import CollectionSummaryTable from './CollectionSummaryTable.jsx';

const SummaryByCollections = () => {
  const collectionList = trpc.collections.allCollections.useQuery();

  const [openedCollections, setOpenedCollections] = useState<string[]>([]);

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

  return (
    <div>
      <h2 className="text-2xl font-bold mt-8">Collections</h2>
      {collectionList.data ? (
        collectionList.data.map(collection => (
          <details
            key={collection.name}
            className="p-1"
            onToggle={handleCollectionToggle(collection.name)}
          >
            <summary className="font-semibold text-xl my-2 cursor-pointer">
              {collection.name}
            </summary>
            <CollectionSummaryTable collectionName={collection.name} />
          </details>
        ))
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default SummaryByCollections;
