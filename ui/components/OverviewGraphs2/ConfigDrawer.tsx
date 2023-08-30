import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import { WorkTypeTabConfigBody } from './WorkTypeTabConfigBody.jsx';

export const ConfigDrawer = () => {
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery(
    { queryContext },
    { keepPreviousData: true }
  );

  return (
    <div>
      <DrawerTabs
        tabs={
          pageConfig.data?.workItemsConfig?.map(config => ({
            title: config.name[0],
            key: config.name[1],
            // eslint-disable-next-line react/no-unstable-nested-components
            BodyComponent: () => (
              <WorkTypeTabConfigBody config={config} key={config.name[1]} />
            ),
          })) || []
        }
      />
    </div>
  );
};
