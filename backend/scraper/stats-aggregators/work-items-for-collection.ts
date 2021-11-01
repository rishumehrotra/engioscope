import pluralize from 'pluralize';
import { reduce } from 'rambda';
import type {
  AnalysedWorkItems, UIWorkItem, UIWorkItemType
} from '../../../shared/types';
import { exists, isNewerThan, unique } from '../../utils';
import workItemIconSvgs from '../../work-item-icon-svgs';
import azure from '../network/azure';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from '../parse-config';
import type { WorkItemAnalysis } from '../types';
import type {
  WorkItem, WorkItemQueryHierarchialResult, WorkItemQueryResult, WorkItemType
} from '../types-azure';
import { queryForCollectionWorkItems } from '../work-item-queries';
import { getOverviewData } from './work-item-overview';
import { workItemTypeId, workItemTypeIconColor } from './work-item-utils';

type WorkItemIDTree = WorkItemQueryResult<WorkItemQueryHierarchialResult>;
type ProjectName = string;
type WorkItemTypeName = string;
type WorkItemTypeByTypeName = Record<WorkItemTypeName, WorkItemType>;

const workItemTypesByType = reduce<WorkItemType, WorkItemTypeByTypeName>(
  (acc, workItemType) => {
    acc[workItemType.name] = workItemType;
    return acc;
  }, {}
);

type WorkItemTypeByCollection = Record<ProjectName, WorkItemTypeByTypeName>;

const getWorkItemTypesForCollection = (
  getWorkItemTypes: (collectionName: string, projectName: string) => Promise<WorkItemType[]>,
  collection: ParsedCollection
) => Promise.all(collection.projects.map(async project => ({
  [project.name.toLowerCase()]: workItemTypesByType(
    await getWorkItemTypes(collection.name, project.name)
  )
}))).then(reduce<WorkItemTypeByCollection, WorkItemTypeByCollection>(
  (acc, cur) => Object.assign(acc, cur), {}
));

const workItemsById = (
  getCollectionWorkItems: (collectionName: string, workItemIds: number[]) => Promise<WorkItem[]>,
  collection: ParsedCollection
) => async (workItemTreeForCollection: WorkItemIDTree) => {
  const ids = unique(
    workItemTreeForCollection.workItemRelations.flatMap(wir => (
      [wir.source?.id, wir.target?.id]
    ))
  ).filter(exists);

  const workItems = await getCollectionWorkItems(collection.name, ids);
  return workItems.reduce<Record<number, WorkItem>>((acc, wi) => {
    // Not immutable to avoid memory trashing
    acc[wi.id] = wi;
    return acc;
  }, {});
};

const sourceByWorkItemId = (workItemRelations: WorkItemIDTree['workItemRelations']) => (
  workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
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

    if (!sources) return [];
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
    const minDates = fieldArray.reduce<number[]>((acc, fieldName) => {
      const value = workItem.fields[fieldName];
      if (!value) return acc;
      return acc.concat(new Date(value).getTime());
    }, []);

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

const computeLeadTime = (workItem: WorkItem) => ({
  leadTime: {
    start: new Date(workItem.fields['System.CreatedDate']).toISOString(),
    end: workItem.fields['Microsoft.VSTS.Common.ClosedDate']
      ? new Date(workItem.fields['Microsoft.VSTS.Common.ClosedDate']).toISOString()
      : undefined
  }
});

const createWorkItemTypeGetter = (workItemTypesForCollection: Record<ProjectName, WorkItemTypeByTypeName>) => (
  (workItem: WorkItem) => {
    const projectName = workItem.fields['System.TeamProject'];
    const workItemTypeName = workItem.fields['System.WorkItemType'];
    return workItemTypesForCollection[projectName.toLowerCase()][workItemTypeName];
  }
);

const rca = (collectionConfig: ParsedCollection, workItem: WorkItem, workItemType: WorkItemType) => {
  if (workItemType.name !== 'Bug') return;
  const match = collectionConfig.workitems.types?.find(({ type }) => type === workItemType.name);
  if (!match?.rootCause) return;
  if (match.rootCause.every(field => !workItem.fields[field])) return;

  return { rca: match.rootCause.map(field => workItem.fields[field]) };
};

const filterTags = (collectionConfig: ParsedCollection, workItem: WorkItem) => {
  if ((collectionConfig.workitems.filterBy || []).length === 0) return;

  const filterBy = collectionConfig.workitems.filterBy?.map(filter => {
    const tags = filter.fields.map(field => {
      const fieldValue = workItem.fields[field];
      if (fieldValue && filter.delimiter) {
        return fieldValue.split(filter.delimiter);
      }
      return fieldValue;
    }).flat().filter(exists).filter(x => x.length);

    if (tags.length === 0) return;

    return {
      label: filter.label,
      tags
    };
  }).filter(exists);

  if (!filterBy) return;
  if (filterBy.length === 0) return;

  return { filterBy };
};

const uiWorkItemCreator = (
  collectionConfig: ParsedCollection,
  getWorkItemType: (workItem: WorkItem) => WorkItemType
) => (
  (workItem: WorkItem): UIWorkItem => {
    const workItemType = getWorkItemType(workItem);

    return {
      id: workItem.id,
      title: workItem.fields['System.Title'],
      url: workItem.url.replace('_apis/wit/workItems', '_workitems/edit'),
      typeId: workItemTypeId(workItemType),
      state: workItem.fields['System.State'],
      project: workItem.fields['System.TeamProject'],
      created: {
        on: workItem.fields['System.CreatedDate'].toISOString()
        // name: workItem.fields['System.CreatedBy']
      },
      updated: {
        on: workItem.fields['System.ChangedDate'].toISOString()
      },
      env: collectionConfig.workitems.environmentField
        ? workItem.fields[collectionConfig.workitems.environmentField]
        : undefined,
      priority: workItem.fields['Microsoft.VSTS.Common.Priority'],
      severity: workItem.fields['Microsoft.VSTS.Common.Severity'],
      ...computeCLT(collectionConfig, workItem),
      ...computeLeadTime(workItem),
      ...rca(collectionConfig, workItem, workItemType),
      ...filterTags(collectionConfig, workItem)
    };
  }
);

const fireOffCollectionAPICalls = (config: ParsedConfig, collection: ParsedCollection) => {
  const {
    getCollectionWorkItemIdsForQuery, getWorkItemTypes, getCollectionWorkItems
  } = azure(config);
  const pGetWorkItemType = getWorkItemTypesForCollection(getWorkItemTypes, collection)
    .then(createWorkItemTypeGetter);

  const workItemIdTree = workItemsById(getCollectionWorkItems, collection);

  const workItemDetails = async () => {
    const workItemTreeForCollection: WorkItemIDTree = await getCollectionWorkItemIdsForQuery(
      collection.name, queryForCollectionWorkItems(config.azure.queryFrom, collection)
    );

    const workItems = await workItemIdTree(workItemTreeForCollection);

    const isInQueryPeriod = isNewerThan(config.azure.queryFrom);

    const reducedWorkItemRelations = workItemTreeForCollection.workItemRelations
      .filter(wir => {
        const source = wir.source ? workItems[wir.source.id] : undefined;
        const target = wir.target ? workItems[wir.target.id] : undefined;

        const sourceLastStateChangeDate = source?.fields['Microsoft.VSTS.Common.StateChangeDate'];
        const targetLastStateChangeDate = target?.fields['Microsoft.VSTS.Common.StateChangeDate'];

        if (source && !target) {
          return sourceLastStateChangeDate ? isInQueryPeriod(sourceLastStateChangeDate) : true;
        }

        if (!source && target) {
          return targetLastStateChangeDate ? isInQueryPeriod(targetLastStateChangeDate) : true;
        }

        if (!source && !target) return true; // This should not be a possibility

        // We have both source and target
        if (!targetLastStateChangeDate) return true; // Target is not closed, so it's in the query period
        if (!sourceLastStateChangeDate) return true; // Source is not closed, so it's in the query period

        return isInQueryPeriod(targetLastStateChangeDate) || isInQueryPeriod(sourceLastStateChangeDate);
      });

    const reducedWorkItemIds = unique(
      reducedWorkItemRelations.flatMap(
        wir => [wir.source?.id, wir.target?.id]
      )
    ).filter(exists);

    const reducedWorkItems = Object.entries(workItems)
      .reduce<typeof workItems>((acc, [workItemId, workItem]) => {
        if (reducedWorkItemIds.includes(Number(workItemId))) {
          acc[Number(workItemId)] = workItem;
        }
        return acc;
      }, {});

    return [reducedWorkItemRelations, reducedWorkItems] as const;
  };

  return Promise.all([
    pGetWorkItemType,
    workItemDetails()
  ] as const);
};

export default (config: ParsedConfig) => (collection: ParsedCollection) => {
  const pCollectionData = fireOffCollectionAPICalls(config, collection);

  return async (project: ParsedProjectConfig): Promise<WorkItemAnalysis> => {
    const [
      getWorkItemType, [workItemRelations, workItemsById]
    ] = await pCollectionData;

    const createUIWorkItem = uiWorkItemCreator(collection, getWorkItemType);

    const workItemsForProject = Object.values(workItemsById)
      .filter(wi => wi.fields['System.TeamProject'] === project.name);

    const sourcesForWorkItem = sourcesUntilMatch(
      sourceByWorkItemId(workItemRelations),
      workItemsById,
      project
    );

    const topLevelItems = unique(
      workItemsForProject.flatMap(workItem => sourcesForWorkItem(workItem.id))
    );

    type AggregatedWorkItemsAndTypes = {
      byId: Record<number, UIWorkItem>;
      types: Record<string, UIWorkItemType>;
    };

    const { byId, types } = Object.entries(workItemsById).reduce<AggregatedWorkItemsAndTypes>((acc, [id, workItem]) => {
      acc.byId[Number(id)] = createUIWorkItem(workItem);

      const workItemType = getWorkItemType(workItem);
      const witId = workItemTypeId(workItemType);

      if (!acc.types[witId]) {
        const iconColor = workItemTypeIconColor(workItemType);

        acc.types[witId] = {
          name: [workItemType.name, pluralize(workItemType.name)],
          color: workItemType.color,
          icon: `data:image/svg+xml;utf8,${encodeURIComponent(workItemIconSvgs[workItemType.icon.id](iconColor))}`,
          iconColor,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
          workCenters: collection.workitems
            .types?.find(wit => wit.type === workItemType.name)?.workCenters
            .map(wc => wc.label)!
        };
      }

      return acc;
    }, { byId: {}, types: {} });

    const ids = workItemRelations.reduce<Record<number, number[]>>((acc, wir) => {
      if (!wir.source) return acc;
      const parent = wir.source ? wir.source.id : 0;

      acc[parent] = unique([...(acc[parent] || []), wir.target?.id].filter(exists));
      return acc;
    }, { 0: topLevelItems });

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const bugLeakage = collection.workitems.environmentField
      ? workItemsForProject.reduce<NonNullable<AnalysedWorkItems['bugLeakage']>>((acc, workItem) => {
        if (!collection.workitems.environmentField) return acc; // Stupid line for TS
        if (!workItem.fields['System.WorkItemType'].toLowerCase().includes('bug')) return acc;
        if (!workItem.fields[collection.workitems.environmentField]) return acc;
        if (workItem.fields['System.State'] === 'Withdrawn') return acc;

        const env = workItem.fields[collection.workitems.environmentField];

        const isCreatedInLastMonth = workItem.fields['System.CreatedDate'] >= monthAgo;
        const isClosedInLastMonth = (
          workItem.fields['Microsoft.VSTS.Common.ClosedDate']
          && workItem.fields['Microsoft.VSTS.Common.ClosedDate'] >= monthAgo
        );

        if (!isCreatedInLastMonth && !isClosedInLastMonth) return acc;

        acc[env] = {
          opened: [...(acc[env]?.opened || []), ...(isCreatedInLastMonth ? [workItem.id] : [])],
          closed: [...(acc[env]?.closed || []), ...(isClosedInLastMonth ? [workItem.id] : [])]
        };

        return acc;
      }, {})
      : null;

    return {
      analysedWorkItems: {
        byId, ids, bugLeakage, types
      },
      overview: getOverviewData(
        config, collection, workItemsForProject, byId, types, getWorkItemType
      )
    };
  };
};
