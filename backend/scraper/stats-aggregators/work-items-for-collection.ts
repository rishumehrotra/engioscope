import { reduce } from 'rambda';
import type { AnalysedWorkItems, UIWorkItem } from '../../../shared/types';
import { exists } from '../../utils';
import azure from '../network/azure';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from '../parse-config';
import type {
  WorkItem, WorkItemQueryHierarchialResult, WorkItemQueryResult, WorkItemType
} from '../types-azure';
import { queryForCollectionWorkItems } from '../work-item-queries';

type WorkItemIDTree = WorkItemQueryResult<WorkItemQueryHierarchialResult>;
type CollectionName = string;
type WorkItemTypeName = string;
type WorkItemTypeByTypeName = Record<WorkItemTypeName, WorkItemType>;

const workItemTypesByType = reduce<WorkItemType, WorkItemTypeByTypeName>(
  (acc, workItemType) => ({ ...acc, [workItemType.name]: workItemType }), {}
);

const getWorkItemTree = (
  getCollectionWorkItemIdsForQuery: (collectionName: string, query: string) => Promise<WorkItemIDTree>,
  collection: ParsedCollection,
  config: ParsedConfig
) => getCollectionWorkItemIdsForQuery(
  collection.name, queryForCollectionWorkItems(config.azure.queryFrom, collection)
);

type WorkItemTypeByCollection = Record<CollectionName, WorkItemTypeByTypeName>;

const getWorkItemTypesByCollection = (
  getWorkItemTypes: (collectionName: string) => (projectName: string) => Promise<WorkItemType[]>,
  collection: ParsedCollection
) => Promise.all(collection.projects.map(async project => ({
  [project.name.toLowerCase()]: workItemTypesByType(
    await getWorkItemTypes(collection.name)(project.name)
  )
}))).then(reduce<WorkItemTypeByCollection, WorkItemTypeByCollection>(
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

const sourceByWorkItemId = (workItemTreeForCollection: WorkItemIDTree) => (
  workItemTreeForCollection.workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
    if (wir.target) {
      acc[wir.target.id] = [...(acc[wir.target.id] || []), wir.source?.id].filter(exists);
    }
    return acc;
  }, {})
);

const sourcesUntilMatch = (
  sourcesByWorkItemId: Record<number, number[]>,
  workItemsById: Record<number, WorkItem>,
  projectConfig: ParsedProjectConfig
) => {
  const recurse = (workItemId: number, seen: number[]): number[] => {
    if (projectConfig.workitems.groupUnder.includes(workItemsById[workItemId].fields['System.WorkItemType'])) {
      return [workItemId];
    }

    const sources = sourcesByWorkItemId[workItemId];
    if (!sources.length) return [];

    return sources.flatMap(source => {
      if (seen.includes(source)) return [];
      seen.push(source);

      if (projectConfig.workitems.groupUnder.includes(workItemsById[source].fields['System.WorkItemType'])) {
        return [source];
      }
      return recurse(source, seen);
    }).filter(exists);
  };

  return (workItemId: number) => recurse(workItemId, []);
};

type CLT = {
  clt: {
    start?: string;
    end?: string;
  };
};

const computeCLT = (collectionConfig: ParsedCollection, workItem: WorkItem): CLT | undefined => {
  if (!collectionConfig.workitems.changeLeadTime) return undefined;

  const matchingCLTConfig = collectionConfig.workitems.changeLeadTime[workItem.fields['System.WorkItemType']];
  if (!matchingCLTConfig) return undefined;

  if (matchingCLTConfig.whenMatchesField) {
    const matchesWorkItem = matchingCLTConfig.whenMatchesField?.every(({ field, value }) => (
      workItem.fields[field] === value
    ));
    if (!matchesWorkItem) return undefined;
  }

  const computeDate = (fieldArray: string[]) => {
    const minDates = fieldArray
      .map(f => workItem.fields[f])
      .filter(exists)
      .map(s => new Date(s).getTime());

    if (minDates.length === 0) return undefined;
    return new Date(Math.min(...minDates)).toISOString();
  };

  return {
    clt: {
      start: computeDate(matchingCLTConfig.startDateField),
      end: computeDate(matchingCLTConfig.endDateField)
    }
  };
};

const uiWorkItemCreator = (collectionConfig: ParsedCollection) => (
  (workItemTypesByCollection: Record<CollectionName, WorkItemTypeByTypeName>) => (
    (workItem: WorkItem): UIWorkItem => {
      const projectName = workItem.fields['System.TeamProject'];
      const workItemTypeName = workItem.fields['System.WorkItemType'];
      const workItemType = workItemTypesByCollection[projectName.toLowerCase()][workItemTypeName];

      return {
        id: workItem.id,
        title: workItem.fields['System.Title'],
        url: workItem.url.replace('_apis/wit/workItems', '_workitems/edit'),
        type: workItemTypeName,
        state: workItem.fields['System.State'],
        project: projectName,
        color: workItemType.color,
        icon: workItemType.icon.url,
        created: {
          on: workItem.fields['System.CreatedDate'].toISOString()
          // name: workItem.fields['System.CreatedBy']
        },
        env: collectionConfig.workitems.environmentField
          ? workItem.fields[collectionConfig.workitems.environmentField]
          : undefined,
        ...computeCLT(collectionConfig, workItem)
      };
    }
  )
);

export default (config: ParsedConfig) => (collection: ParsedCollection) => {
  const {
    getCollectionWorkItemIdsForQuery, getWorkItemTypes, getCollectionWorkItems
  } = azure(config);

  const pWorkItemTreeForCollection = getWorkItemTree(getCollectionWorkItemIdsForQuery, collection, config);
  const pCreateUIWorkItem = getWorkItemTypesByCollection(getWorkItemTypes, collection)
    .then(uiWorkItemCreator(collection));

  const pWorkItemsById = pWorkItemTreeForCollection
    .then(workItemsById(getCollectionWorkItems, collection));

  return async (project: ParsedProjectConfig): Promise<AnalysedWorkItems> => {
    const [
      workItemTreeForCollection, createUIWorkItem, workItemsById
    ] = await Promise.all([
      pWorkItemTreeForCollection, pCreateUIWorkItem, pWorkItemsById
    ]);

    const workItemsForProject = Object.values(workItemsById)
      .filter(wi => wi.fields['System.TeamProject'] === project.name);

    const sourcesForWorkItem = sourcesUntilMatch(
      sourceByWorkItemId(workItemTreeForCollection),
      workItemsById,
      project
    );

    const topLevelItems = [...new Set(workItemsForProject.flatMap(workItem => sourcesForWorkItem(workItem.id)))];

    return {
      byId: Object.entries(workItemsById).reduce<Record<number, UIWorkItem>>((acc, [id, workItem]) => {
        acc[Number(id)] = createUIWorkItem(workItem);
        return acc;
      }, {}),
      ids: workItemTreeForCollection.workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
        if (!wir.source) return acc;
        const parent = wir.source ? wir.source.id : 0;

        acc[parent] = [...new Set([...(acc[parent] || []), wir.target?.id].filter(exists))];
        return acc;
      }, { 0: topLevelItems })
    };
  };
};
