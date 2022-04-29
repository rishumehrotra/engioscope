import type { WorkItemQueryFlatResult, WorkItemQueryResult } from '../types-azure';
import {
  automatedTestCases, automatedTestCasesOfPriority,
  notAutomatedTestCases, notAutomatedTestCasesOfPriority, priorities
} from '../queries/test-cases';

export default async (
  getIds: (query: string) => Promise<WorkItemQueryResult<WorkItemQueryFlatResult>>,
  projectName: string
) => {
  const getCount = (query: string) => getIds(query).then(r => r.workItems.length);

  const [
    automatedTestCasesCount,
    notAutomatedTestCasesCount,
    automatedTestCasesP1,
    automatedTestCasesP2,
    automatedTestCasesP3,
    automatedTestCasesP4,
    automatedTestCasesP5,
    notAutomatedTestCasesP1,
    notAutomatedTestCasesP2,
    notAutomatedTestCasesP3,
    notAutomatedTestCasesP4,
    notAutomatedTestCasesP5
  ] = await Promise.all([
    getCount(automatedTestCases(projectName)),
    getCount(notAutomatedTestCases(projectName)),
    ...priorities.map(priority => getCount(automatedTestCasesOfPriority(projectName, priority))),
    ...priorities.map(priority => getCount(notAutomatedTestCasesOfPriority(projectName, priority)))
  ]);

  return {
    automated: {
      total: automatedTestCasesCount,
      p1: automatedTestCasesP1,
      p2: automatedTestCasesP2,
      p3: automatedTestCasesP3,
      p4: automatedTestCasesP4,
      p5: automatedTestCasesP5
    },
    notAutomated: {
      total: notAutomatedTestCasesCount,
      p1: notAutomatedTestCasesP1,
      p2: notAutomatedTestCasesP2,
      p3: notAutomatedTestCasesP3,
      p4: notAutomatedTestCasesP4,
      p5: notAutomatedTestCasesP5
    }
  };
};
