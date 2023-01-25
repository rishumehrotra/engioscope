import type { ParsedCollection } from '../parse-config.js';

const join = (ss: string[]) => ss.map(s => `'${s}'`).join(', ');

const ignoreStates = (collectionConfig: ParsedCollection) =>
  collectionConfig.changeProgram?.ignoreStates.length
    ? `
      AND NOT [System.State] IN (${join(collectionConfig.changeProgram?.ignoreStates)})
    `
    : '';

export const getChangeProgramTasks = (collectionConfig: ParsedCollection) => `
  SELECT [System.Id]
  FROM workitems
  WHERE [System.WorkItemType] = "${collectionConfig.changeProgram?.workItemTypeName}"
  AND [System.TeamProject] IN (${join(collectionConfig.projects.map(p => p.name))})
  ${ignoreStates(collectionConfig)}
`;
