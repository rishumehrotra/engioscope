import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { Tab, Tabs as ReactTabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import Loading from '../Loading.jsx';

type TabsProps = {
  tabs: {
    title: ReactNode;
    key: string;
    BodyComponent: React.FC;
  }[];
  selectedTabIndex?: number;
};

const Tabs: React.FC<TabsProps> = ({
  tabs,
  selectedTabIndex: inputSelectedTabIndex = 0,
}) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(inputSelectedTabIndex);

  const tabContents = useMemo(() => {
    const Component = tabs[selectedTabIndex].BodyComponent;
    return <Component />;
  }, [selectedTabIndex, tabs]);

  return (
    <ReactTabs selectedIndex={selectedTabIndex} onSelect={setSelectedTabIndex}>
      <TabList>
        {tabs.map(tab => (
          <Tab key={`tab-${tab.key}`}>{tab.title}</Tab>
        ))}
      </TabList>

      {tabs.map((tab, index) => (
        <TabPanel key={`tabpanel-${tab.key}`}>
          {index === selectedTabIndex ? tabContents : <Loading />}
        </TabPanel>
      ))}
    </ReactTabs>
  );
};

export default Tabs;
