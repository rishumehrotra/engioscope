import { prop } from 'rambda';
import type { UIChangeProgramTask } from '../../../shared/types.js';
import type azure from '../network/azure.js';
import type { ParsedCollection } from '../parse-config.js';
import { getChangeProgramTasks } from '../queries/change-program-tasks.js';
import type { WorkItem, WorkItemQueryFlatResult, WorkItemQueryResult } from '../types-azure.js';

const createChangeProgramTask = (collectionConfig: ParsedCollection) => (wi: WorkItem): UIChangeProgramTask => ({
  id: wi.id,
  title: wi.fields['System.Title'],
  url: wi.url.replace('_apis/wit/workItems', '_workitems/edit'),
  state: wi.fields['System.State'],
  project: wi.fields['System.TeamProject'],
  collection: collectionConfig.name,
  created: {
    on: new Date(wi.fields['System.CreatedDate']).toISOString()
  },
  updated: {
    on: new Date(wi.fields['System.ChangedDate']).toISOString()
  },
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  team: wi.fields[collectionConfig.changeProgram!.teamNameField],
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  theme: wi.fields[collectionConfig.changeProgram!.themeNameField],
  plannedStart: collectionConfig.changeProgram?.plannedStartDateField
    ? wi.fields[collectionConfig.changeProgram.plannedStartDateField]
    : undefined,
  plannedCompletion: collectionConfig.changeProgram?.plannedCompletionDateField
    ? wi.fields[collectionConfig.changeProgram.plannedCompletionDateField]
    : undefined,
  actualStart: collectionConfig.changeProgram?.actualStartDateField
    ? wi.fields[collectionConfig.changeProgram.actualStartDateField]
    : undefined,
  actualCompletion: collectionConfig.changeProgram?.actualCompletionDateField
    ? wi.fields[collectionConfig.changeProgram.actualCompletionDateField]
    : undefined
});

const queryName = 'change-program-tasks';

const changeProgramTasks = async (
  collectionConfig: ParsedCollection,
  getCollectionWorkItemIdsForQuery: ReturnType<typeof azure>['getCollectionWorkItemIdsForQuery'],
  getCollectionWorkItems: ReturnType<typeof azure>['getCollectionWorkItems']
) => {
  const query = getChangeProgramTasks(collectionConfig);
  const queryResult: WorkItemQueryResult<WorkItemQueryFlatResult> = (
    await getCollectionWorkItemIdsForQuery(collectionConfig.name, query, queryName)
  );
  const wis = getCollectionWorkItems(collectionConfig.name, queryResult.workItems.map(prop('id')), queryName);
  return (await wis).map(createChangeProgramTask(collectionConfig));
};

export default (
  getCollectionWorkItemIdsForQuery: ReturnType<typeof azure>['getCollectionWorkItemIdsForQuery'],
  getCollectionWorkItems: ReturnType<typeof azure>['getCollectionWorkItems']
) => async (
  collectionConfig: ParsedCollection
) => {
  if (!collectionConfig.changeProgram) return [];
  return changeProgramTasks(collectionConfig, getCollectionWorkItemIdsForQuery, getCollectionWorkItems);
};
