import type { ParsedCollection } from './parse-config';

const dayInMs = 24 * 60 * 60 * 1000;

const join = (ss: string[]) => ss.map(s => `'${s}'`).join(', ');

const skipChildren = (collectionConfig: ParsedCollection) => (
  collectionConfig.workitems.skipChildren?.length
    ? `AND NOT [Target].[System.WorkItemType] IN (${join(collectionConfig.workitems.skipChildren)}) `
    : ''
);

const ignoreStates = (collectionConfig: ParsedCollection) => (
  collectionConfig.workitems.ignoreStates?.length
    ? `AND NOT [Target].[System.State] IN (${join(collectionConfig.workitems.ignoreStates)}) `
    : ''
);

export const queryForCompletedCollectionWorkItems = (queryFrom: Date, collectionConfig: ParsedCollection) => {
  const daysToLookup = Math.round((Date.now() - queryFrom.getTime()) / dayInMs);

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE
      [Source].[System.WorkItemType] IN (${join(collectionConfig.workitems.getWorkItems)})
      AND [Source].[Microsoft.VSTS.Common.StateChangeDate] >= @today-${daysToLookup}
      ${skipChildren(collectionConfig)}
      ${ignoreStates(collectionConfig)}
      AND [Source].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
      AND [Target].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
    ORDER BY [System.CreatedDate] ASC
    MODE (MustContain)
  `;
};
