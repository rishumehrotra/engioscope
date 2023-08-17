import React from 'react';
import { prop } from 'rambda';
import PageSection from './PageSection.jsx';
import BugGraphCard from './BugGraphCard.jsx';
import useGraphArgs from './useGraphArgs.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';

type BugWorkItems = RouterClient['workItems']['getBugLeakage'];

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
  const groupsWithCount = data
    .flatMap(bug =>
      bug.groups.map(group => ({
        groupName: group.groupName,
        count: group.bugs.reduce((sum, cls) => sum + cls.count, 0),
      }))
    )
    .reduce((groupAcc, { groupName, count }) => {
      if (groupAcc?.has(groupName)) {
        groupAcc.set(groupName, (groupAcc?.get(groupName) || 0) + count);
      } else {
        groupAcc.set(groupName, count);
      }
      return groupAcc;
    }, new Map<string, number>());

  return Array.from(groupsWithCount, ([groupName, count]) => ({
    groupName,
    count,
  })) as { groupName: string; count: number }[];
};

const BugLeakage = () => {
  const graphArgs = useGraphArgs();
  const graph = trpc.workItems.getBugLeakage.useQuery(graphArgs);
  const [rcaFields] = React.useState<{ label: string; value: string }[] | null>(
    getRcaFields(graph.data) || null
  );
  const [groups] = React.useState<{ groupName: string; count: number }[] | null>(
    getGroups(graph.data) || null
  );

  return (
    <PageSection
      heading="Bug leakage with root cause"
      subheading="Bugs leaked over the last 84 days with their root cause"
    >
      <BugGraphCard data={graph.data} rcaFields={rcaFields || []} groups={groups || []} />
    </PageSection>
  );
};

export default BugLeakage;
