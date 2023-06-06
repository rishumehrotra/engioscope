import React from 'react';
import Tabs from '../common/Tabs.jsx';

const YAMLPipelinesDrawer = () => {
  return (
    <Tabs
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
