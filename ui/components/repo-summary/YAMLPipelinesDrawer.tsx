import React from 'react';
import DrawerTabs from './DrawerTabs.jsx';

const YAMLPipelinesDrawer = () => {
  return (
    <DrawerTabs
      tabs={[
        {
          title: 'Not using YAML',
          key: 'non-yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => <div>Tab contents for not-using-yaml</div>,
        },
        {
          title: 'Using YAML',
          key: 'yaml',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => <div>Tab contents for using yaml</div>,
        },
        {
          title: 'All pipelines',
          key: 'all',
          // eslint-disable-next-line react/no-unstable-nested-components
          BodyComponent: () => <div>All pipelines</div>,
        },
      ]}
    />
  );
};

export default YAMLPipelinesDrawer;
