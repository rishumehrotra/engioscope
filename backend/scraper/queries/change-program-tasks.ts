import type { ParsedCollection } from '../parse-config';

const join = (ss: string[]) => ss.map(s => `'${s}'`).join(', ');

export const getChangeProgramTasks = (collectionConfig: ParsedCollection) => `
  SELECT [System.Id]
  FROM workitems
  WHERE [System.WorkItemType] = "${collectionConfig.changeProgram?.workItemTypeName}"
  AND [System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
`;
