import type { ParsedCollection } from '../parse-config';

const dayInMs = 24 * 60 * 60 * 1000;

const join = (ss: string[]) => ss.map(s => `'${s}'`).join(', ');

const skipChildren = (collectionConfig: ParsedCollection) => (
  collectionConfig.workitems.skipChildren?.length
    ? `AND NOT [Target].[System.WorkItemType] IN (${join(collectionConfig.workitems.skipChildren)}) `
    : ''
);

const ignoreStates = (collectionConfig: ParsedCollection) => (
  collectionConfig.workitems.ignoreStates?.length
    ? `
      AND NOT [Source].[System.State] IN (${join(collectionConfig.workitems.ignoreStates)})
      AND NOT [Target].[System.State] IN (${join(collectionConfig.workitems.ignoreStates)}) 
    `
    : ''
);

const additionalClausesForWIPWorkItems = (collectionConfig: ParsedCollection) => {
  const clause = (collectionConfig.workitems.types || [])
    .filter(type => type.startDate.length && type.endDate.length)
    .map(type => `(
      [Source].[System.WorkItemType] = '${type.type}'
      AND (${type.startDate.map(startDate => `[Source].[${startDate}] <> ''`).join(' OR ')})
      AND ${type.endDate.map(endDate => `[Source].[${endDate}] = ''`).join(' AND ')}
    )`)
    .join(' OR ');

  return clause ? `OR ${clause}` : '';
};

export const queryForCollectionWorkItems = (queryFrom: Date, collectionConfig: ParsedCollection) => {
  const daysToLookup = Math.round((Date.now() - queryFrom.getTime()) / dayInMs);

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE
      [Source].[System.WorkItemType] IN (${join(collectionConfig.workitems.getWorkItems)})
      AND (
        [Source].[Microsoft.VSTS.Common.StateChangeDate] >= @today-${daysToLookup}
        ${additionalClausesForWIPWorkItems(collectionConfig)}
      )
      ${skipChildren(collectionConfig)}
      ${ignoreStates(collectionConfig)}
      AND [Source].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
      AND [Target].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
    ORDER BY [System.CreatedDate] ASC
    MODE (MustContain)
  `;
};
