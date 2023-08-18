import React, { useEffect } from 'react';
import { prop } from 'rambda';
import PageSection from './PageSection.jsx';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';

export type BugWorkItems = RouterClient['workItems']['getBugLeakage'];
export type Group = { rootCauseField: string; groupName: string; count: number };

const getRcaFields = (data: BugWorkItems) => {
  if (!data) return null;
  return data.map(prop('rootCauseField')).map(fields => {
    return {
      label: fields,
      value: fields,
    };
  });
};

const getGroups = (data: BugWorkItems) => {
  if (!data) return null;

  return data.flatMap(rootCauseField => {
    return rootCauseField.groups.map(group => ({
      rootCauseField: rootCauseField.rootCauseField,
      groupName: group.groupName,
      count: group.bugs.reduce((sum, rootCause) => sum + rootCause.count, 0),
    }));
  });
};

const BugLeakage = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getBugLeakage.useQuery(graphArgs);
  const [rcaFields, setRcaFields] = React.useState<
    { label: string; value: string }[] | null
  >(getRcaFields(graph.data) || null);
  const [groups, setGroups] = React.useState<Group[] | null>(
    getGroups(graph.data) || null
  );

  useEffect(() => {
    setGroups(getGroups(graph.data) || null);
  }, [graph.data]);

  useEffect(() => {
    setRcaFields(getRcaFields(graph.data) || null);
  }, [graph.data]);

  return (
    <PageSection
      heading="Bug leakage with root cause"
      subheading="Bugs leaked over the last 84 days with their root cause"
    >
      <BugGraphCard
        data={graph.data}
        rcaFields={rcaFields || []}
        groups={groups || []}
        drawer={(groupName: string) => ({
          heading: groupName,
          children: 'Loading...',
        })}
      />
    </PageSection>
  );
};

export default BugLeakage;
