import type { ParsedCollection } from './parse-config';

const dayInMs = 24 * 60 * 60 * 1000;

export const queryForCollectionWorkItems = (queryFrom: Date, collectionConfig: ParsedCollection) => {
  const daysToLookup = Math.round((Date.now() - queryFrom.getTime()) / dayInMs);
  const join = (ss: string[]) => ss.map(s => `'${s}'`).join(', ');

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE
      [Source].[System.WorkItemType] IN (${join(collectionConfig.workitems.getWorkItems)})
      AND [Source].[System.ChangedDate] >= @today-${daysToLookup}
      AND NOT [Target].[System.WorkItemType] IN (${join(collectionConfig.workitems.skipChildren)})
      AND [Source].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
      AND [Target].[System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
    ORDER BY [System.CreatedDate] ASC
    MODE (MustContain)
  `;
};
