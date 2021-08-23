import type { AnalysedWorkItems } from '../../../shared/types';
import { exists } from '../../utils';
import azure from '../network/azure';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from '../parse-config';
import type {
  WorkItem, WorkItemQueryHierarchialResult, WorkItemQueryResult, WorkItemType
} from '../types-azure';
import { queryForCollectionWorkItems } from '../work-item-queries';

type WorkItemIDTree = WorkItemQueryResult<WorkItemQueryHierarchialResult>;

const workItemTypesByType = (workItemTypes: WorkItemType[]) => workItemTypes
  .reduce<Record<string, WorkItemType>>((acc, workItemType) => ({
    ...acc,
    [workItemType.name]: workItemType
  }), {});

const getWorkItemTree = (
  getCollectionWorkItemIdsForQuery: (collectionName: string, query: string) => Promise<WorkItemIDTree>,
  collection: ParsedCollection,
  config: ParsedConfig
) => getCollectionWorkItemIdsForQuery(
  collection.name,
  queryForCollectionWorkItems(config.azure.queryFrom, collection)
);

const getWorkItemTypesByCollection = (
  getWorkItemTypes: (collectionName: string) => (projectName: string) => Promise<WorkItemType[]>,
  collection: ParsedCollection
) => Promise.all(
  collection.projects.map(async project => ({
    [project.name]: workItemTypesByType(await getWorkItemTypes(collection.name)(project.name))
  }))
).then(workItemTypes => workItemTypes.reduce<Record<string, Record<string, WorkItemType>>>(
  (acc, cur) => ({ ...acc, ...cur }), {}
));

const workItemsById = (
  getCollectionWorkItems: (collectionName: string, workItemIds: number[]) => Promise<WorkItem[]>,
  collection: ParsedCollection
) => async (workItemTreeForCollection: WorkItemIDTree) => {
  const ids = [...new Set(workItemTreeForCollection.workItemRelations.flatMap(wir => (
    [wir.source?.id, wir.target?.id]
  )))].filter(exists);

  const workItems = await getCollectionWorkItems(collection.name, ids);
  return workItems.reduce<Record<number, WorkItem>>((acc, wi) => {
    // Not immutable to avoid memory trashing
    acc[wi.id] = wi;
    return acc;
  }, {});
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sourceByWorkItemId = (workItemTreeForCollection: WorkItemIDTree) => (
  workItemTreeForCollection.workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
    if (wir.target) {
      acc[wir.target.id] = [...(acc[wir.target.id] || []), wir.source?.id].filter(exists);
    }
    return acc;
  }, {})
);

export default (config: ParsedConfig) => (collection: ParsedCollection) => {
  const {
    getCollectionWorkItemIdsForQuery, getWorkItemTypes, getCollectionWorkItems
  } = azure(config);

  const pWorkItemTreeForCollection = getWorkItemTree(getCollectionWorkItemIdsForQuery, collection, config);
  const pWorkItemTypesByCollection = getWorkItemTypesByCollection(getWorkItemTypes, collection);

  const pWorkItemsById = pWorkItemTreeForCollection
    .then(workItemsById(getCollectionWorkItems, collection));

  return async (project: ParsedProjectConfig): Promise<AnalysedWorkItems> => {
    const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      workItemTreeForCollection, workItemTypesByCollection, workItemsById
    ] = await Promise.all([
      pWorkItemTreeForCollection, pWorkItemTypesByCollection, pWorkItemsById
    ]);

    const workItemsForProject = Object.values(workItemsById)
      .filter(wi => wi.fields['System.TeamProject'] === project.name);

    console.log(`${collection.name}/${project.name} ${Object.values(workItemsById).length}, ${workItemsForProject.length}`);

    return {
      byId: {},
      ids: {}
    };
  };
};
