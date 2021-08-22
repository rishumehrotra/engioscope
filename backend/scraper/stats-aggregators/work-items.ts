import type { UIWorkItem } from '../../../shared/types';
import { exists } from '../../utils';
import type { ProjectConfig } from '../parse-config';
import type {
  WorkItem, WorkItemQueryHierarchialResult, WorkItemType
} from '../types-azure';

const idsFromRelations = (relations: WorkItemQueryHierarchialResult['workItemRelations']) => (
  new Set(relations.flatMap(wir => [wir.source?.id, wir.target?.id]).filter(exists))
);

const workItemsArrayToLookup = (wis: WorkItem[]): Record<number, WorkItem> => (
  wis.reduce<Record<number, WorkItem>>((acc, wi) => {
    // Optimisation to avoid memory thrashing of immutable data structures
    acc[wi.id] = wi;
    return acc;
  }, {})
);

const relationsToIdTree = (workItemRelations: WorkItemQueryHierarchialResult['workItemRelations']) => (
  workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
    const parent = wir.source ? wir.source.id : 0;

    return {
      ...acc,
      [parent]: [...new Set([...(acc[parent] || []), wir.target?.id].filter(exists))]
    };
  }, {})
);

export default async (
  projectConfig: ProjectConfig,
  workItemRelations: WorkItemQueryHierarchialResult['workItemRelations'],
  allBugsAndFeatures: WorkItemQueryHierarchialResult['workItemRelations'] | undefined,
  workItemTypes: WorkItemType[],
  getWorkItemsForIds: (ids: number[]) => Promise<WorkItem[]>
) => {
  if (workItemRelations.length === 0) return null;

  const workItemTypesByType = workItemTypes.reduce<Record<string, WorkItemType>>(
    (acc, workItemType) => ({
      ...acc,
      [workItemType.name]: workItemType
    }), {}
  );

  const workItemRelationsIds = idsFromRelations(workItemRelations);
  const relevantBugsAndFeatures = (allBugsAndFeatures || [])
    // ! FIXME: We shouldn't just look for source.id
    .filter(wir => wir.source && workItemRelationsIds.has(wir.source.id));

  const relevantBugAndFeatureIds = [...idsFromRelations(relevantBugsAndFeatures)];

  const workItemsById = workItemsArrayToLookup(
    await getWorkItemsForIds([...workItemRelationsIds, ...relevantBugAndFeatureIds])
  );

  const createUIWorkItem = (workItem: WorkItem): UIWorkItem => {
    const workItemType = workItemTypesByType[workItem.fields['System.WorkItemType']]
      ? workItemTypesByType[workItem.fields['System.WorkItemType']]
      // TODO: Fix this - we're defaulting to a bug. Instead, find the best work item type match
      : workItemTypesByType.Bug;

    return {
      id: workItem.id,
      title: workItem.fields['System.Title'],
      url: workItem.url.replace('_apis/wit/workItems', '_workitems/edit'),
      type: workItem.fields['System.WorkItemType'],
      state: workItem.fields['System.State'],
      project: workItem.fields['System.TeamProject'],
      color: workItemType.color,
      icon: workItemType.icon.url,
      created: {
        on: workItem.fields['System.CreatedDate'].toISOString()
      // name: workItem.fields['System.CreatedBy']
      },
      ...(projectConfig.workitems?.changeLeadTime ? {
        clt: {
          start: workItem.fields[projectConfig.workitems.changeLeadTime.startDateField],
          end: workItem.fields[projectConfig.workitems.changeLeadTime.endDateField]
        }
      } : undefined)
    };
  };

  return {
    ids: relationsToIdTree([...workItemRelations, ...relevantBugsAndFeatures]),
    byId: Object.entries(workItemsById).reduce<Record<number, UIWorkItem>>((acc, [id, workItem]) => ({
      ...acc,
      [id]: createUIWorkItem(workItem)
    }), {})
  };
};
