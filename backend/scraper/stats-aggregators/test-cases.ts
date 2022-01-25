import type { WorkItemQueryFlatResult, WorkItemQueryResult } from '../types-azure';

const priorities = ['1', '2', '3', '4', '5'] as const;

const queries = {
  automatedTestCases: (projectName: string) => `
    SELECT [System.Id] FROM workitems
    WHERE
      [System.WorkItemType] = 'Test Case'
      AND [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated')
      AND [System.TeamProject] = '${projectName}'
  `,
  notAutomatedTestCases: (projectName: string) => `
    SELECT [System.Id] FROM workitems
    WHERE
      [System.WorkItemType] = 'Test Case'
      AND NOT [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated')
      AND [System.TeamProject] = '${projectName}'
  `,
  automatedTestCasesOfPriority: (projectName: string, priority: (typeof priorities)[number]) => `
    SELECT [System.Id] FROM workitems
    WHERE
      [System.WorkItemType] = 'Test Case'
      AND [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated')
      AND [Microsoft.VSTS.Common.Priority] = ${priority}
      AND [System.TeamProject] = '${projectName}'
  `,
  notAutomatedTestCasesOfPriority: (projectName: string, priority: (typeof priorities)[number]) => `
    SELECT [System.Id] FROM workitems
    WHERE
      [System.WorkItemType] = 'Test Case'
      AND NOT [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated')
      AND [Microsoft.VSTS.Common.Priority] = ${priority}
      AND [System.TeamProject] = '${projectName}'
  `
};

export default async (
  getIds: (query: string) => Promise<WorkItemQueryResult<WorkItemQueryFlatResult>>,
  projectName: string
) => {
  const getCount = (query: string) => getIds(query).then(r => r.workItems.length);

  const [
    automatedTestCases,
    notAutomatedTestCases
    // automatedTestCasesP1,
    // automatedTestCasesP2,
    // automatedTestCasesP3,
    // automatedTestCasesP4,
    // automatedTestCasesP5,
    // notAutomatedTestCasesP1,
    // notAutomatedTestCasesP2,
    // notAutomatedTestCasesP3,
    // notAutomatedTestCasesP4,
    // notAutomatedTestCasesP5
  ] = await Promise.all([
    getCount(queries.automatedTestCases(projectName)),
    getCount(queries.notAutomatedTestCases(projectName))
    // ...priorities.map(priority => getCount(queries.automatedTestCasesOfPriority(priority))),
    // ...priorities.map(priority => getCount(queries.notAutomatedTestCasesOfPriority(priority)))
  ]);

  return {
    automated: {
      total: automatedTestCases
      // p1: automatedTestCasesP1,
      // p2: automatedTestCasesP2,
      // p3: automatedTestCasesP3,
      // p4: automatedTestCasesP4,
      // p5: automatedTestCasesP5
    },
    notAutomated: {
      total: notAutomatedTestCases
      // p1: notAutomatedTestCasesP1,
      // p2: notAutomatedTestCasesP2,
      // p3: notAutomatedTestCasesP3,
      // p4: notAutomatedTestCasesP4,
      // p5: notAutomatedTestCasesP5
    }
  };
};
