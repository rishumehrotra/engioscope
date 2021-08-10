import throat from 'throat';
import { AnalysedWorkItem, UIWorkItem, UIWorkItemRevision } from '../../../shared/types';
import { assertDefined } from '../../utils';
import {
  WorkItem, WorkItemQueryHierarchialResult,
  WorkItemRevision, WorkItemType
} from '../types-azure';

const transformRevision = (revision: WorkItemRevision): UIWorkItemRevision => ({
  state: revision.fields['System.State'],
  date: revision.fields['System.ChangedDate'].toISOString()
});

const aggregateRevisions = (revisions: WorkItemRevision[]) => (
  revisions.reduce<UIWorkItemRevision[]>((acc, revision) => {
    if (acc.length === 0) {
      return [transformRevision(revision)];
    }

    if (acc[acc.length - 1].state === revision.fields['System.State']) {
      return acc;
    }

    return [...acc, transformRevision(revision)];
  }, [])
);

export default async (
  workItemRelations: WorkItemQueryHierarchialResult['workItemRelations'],
  allBugsAndFeatures: WorkItemQueryHierarchialResult['workItemRelations'] | undefined,
  workItemTypes: WorkItemType[],
  getWorkItemsForIds: (ids: number[]) => Promise<WorkItem[]>,
  getWorkItemRevisions: (workItemId: number) => Promise<WorkItemRevision[]>
) => {
  if (workItemRelations.length === 0) return null;

  const workItemTypesByType = workItemTypes.reduce((acc, workItemType) => ({
    ...acc,
    [workItemType.name]: workItemType
  }), {} as { [type: string]: WorkItemType });

  const ids = [...new Set(
    [...workItemRelations, ...(allBugsAndFeatures || [])]
      .flatMap(wir => [wir.source?.id, wir.target?.id])
      .filter(Boolean)
      .map(assertDefined)
  )];

  const idsForWorkItemRevisions = workItemRelations
    .flatMap(wir => [wir.source?.id, wir.target?.id])
    .filter(Boolean)
    .map(assertDefined);

  const [workItemsById, workItemRevisions] = await Promise.all([
    getWorkItemsForIds(ids)
      .then(wis => wis.reduce<Record<number, WorkItem>>((acc, wi) => {
        // Optimisation to avoid memory thrashing of immutable data structures
        acc[wi.id] = wi;
        return acc;
      }, {})),
    Promise.all(
      idsForWorkItemRevisions.map(throat(50, id => getWorkItemRevisions(id).then(wir => [id, wir] as const)))
    ).then(wirs => wirs.reduce<Record<number, WorkItemRevision[]>>((acc, wirAndId) => {
      // Optimisation to avoid memory thrashing of immutable data structures
      const [id, wir] = wirAndId;
      acc[id] = wir;
      return acc;
    }, {}))
  ]);

  const createUIWorkItem = (workItem: WorkItem): UIWorkItem => ({
    id: workItem.id,
    title: workItem.fields['System.Title'],
    url: workItem.url.replace('_apis/wit/workItems', '_workitems/edit'),
    type: workItem.fields['System.WorkItemType'],
    state: workItem.fields['System.State'],
    project: workItem.fields['System.TeamProject'],
    color: workItemTypesByType[workItem.fields['System.WorkItemType']].color,
    icon: workItemTypesByType[workItem.fields['System.WorkItemType']].icon.url,
    created: {
      on: workItem.fields['System.CreatedDate'].toISOString()
      // name: workItem.fields['System.CreatedBy']
    },
    revisions: aggregateRevisions(workItemRevisions[workItem.id])
  });

  return Object.values(
    workItemRelations.reduce<Record<number, AnalysedWorkItem>>((acc, workItemRelation) => {
      const source = workItemRelation.source?.id ? workItemsById[workItemRelation.source.id] : null;

      if (!source) {
        // TODO: This might need better handling
        // eslint-disable-next-line no-console
        console.log('Ignorinng workItemRelation since there\'s no source', workItemRelation);
        return acc;
      }

      const target = workItemRelation.target?.id ? workItemsById[workItemRelation.target.id] : null;

      return {
        ...acc,
        [source.id]: {
          ...(
            acc[source.id] || {
              source: createUIWorkItem(source),
              targets: []
            }
          ),
          targets: [
            ...(acc[source.id]?.targets || []),
            target ? createUIWorkItem(target) : null
          ].filter(Boolean).map(assertDefined)
        }
      };
    }, {})
  );
};
