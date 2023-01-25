export const priorities = ['1', '2', '3', '4', '5'] as const;

export const automatedTestCases = (projectName: string) => `
  SELECT [System.Id] FROM workitems
  WHERE
    [System.WorkItemType] = 'Test Case'
    AND [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated', 'Done')
    AND [System.TeamProject] = '${projectName}'
`;

export const notAutomatedTestCases = (projectName: string) => `
  SELECT [System.Id] FROM workitems
  WHERE
    [System.WorkItemType] = 'Test Case'
    AND NOT [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated', 'Done')
    AND [System.TeamProject] = '${projectName}'
`;

export const automatedTestCasesOfPriority = (
  projectName: string,
  priority: (typeof priorities)[number]
) => `
  SELECT [System.Id] FROM workitems
  WHERE
    [System.WorkItemType] = 'Test Case'
    AND [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated', 'Done')
    AND [Microsoft.VSTS.Common.Priority] = ${priority}
    AND [System.TeamProject] = '${projectName}'
`;

export const notAutomatedTestCasesOfPriority = (
  projectName: string,
  priority: (typeof priorities)[number]
) => `
  SELECT [System.Id] FROM workitems
  WHERE
    [System.WorkItemType] = 'Test Case'
    AND NOT [Microsoft.VSTS.TCM.AutomationStatus] IN ('Complete', 'Automated', 'Done')
    AND [Microsoft.VSTS.Common.Priority] = ${priority}
    AND [System.TeamProject] = '${projectName}'
`;
