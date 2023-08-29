import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getWorkItemTypes } from '../../models/work-item-types.js';
import {
  newWorkItemsListForDate,
  newWorkItemsListForDateInputParser,
  newWorkItemsListForGroup,
  newWorkItemsListForGroupInputParser,
  newWorkItemsSummary,
  newWorkItemsSummaryInputParser,
  workItemForTooltip,
  workItemForTooltipInputParser,
} from '../../models/workitems.js';
import {
  getChangeLoadTimeGraph,
  getCycleTimeGraph,
  getNewGraph,
  getVelocityGraph,
  getPageConfig,
  graphInputParser,
  pageConfigInputParser,
  getNewWorkItems,
  graphArgsInputParser,
  getCycleTimeWorkItems,
  getChangeLeadTimeWorkItems,
  getWipGraph,
  getWipTrendOnDateWorkItems,
  wipTrendOnDateWorkItemsInputParser,
  getBugLeakage,
  bugGraphArgsInputParser,
  getBugLeakageDataForDrawer,
  getFlowEfficiencyGraph,
  getWorkItemTimeSpent,
  timeSpentArgs,
  getGroupByFieldAndStatesForWorkType,
  groupByFieldAndStatesForWorkTypeParser,
} from '../../models/workitems2.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsSummaryInputParser)
    .query(passInputTo(newWorkItemsSummary)),

  getPageConfig: t.procedure
    .input(pageConfigInputParser)
    .query(passInputTo(getPageConfig)),

  getWorkItemTypes: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getWorkItemTypes)),

  newWorkItemsListForGroup: t.procedure
    .input(newWorkItemsListForGroupInputParser)
    .query(passInputTo(newWorkItemsListForGroup)),

  nenwWorkItemsListForDate: t.procedure
    .input(newWorkItemsListForDateInputParser)
    .query(passInputTo(newWorkItemsListForDate)),

  workItemForTooltip: t.procedure
    .input(workItemForTooltipInputParser)
    .query(passInputTo(workItemForTooltip)),

  getNewGraph: t.procedure.input(graphInputParser).query(passInputTo(getNewGraph)),
  getVelocityGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getVelocityGraph)),
  getCycleTimeGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getCycleTimeGraph)),
  getChangeLeadTimeGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getChangeLoadTimeGraph)),
  getWipGraph: t.procedure.input(graphInputParser).query(passInputTo(getWipGraph)),

  getNewWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getNewWorkItems)),
  getCycleTimeWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getCycleTimeWorkItems)),
  getChangeLeadTimeWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getChangeLeadTimeWorkItems)),
  getWipTrendOnDateWorkItems: t.procedure
    .input(wipTrendOnDateWorkItemsInputParser)
    .query(passInputTo(getWipTrendOnDateWorkItems)),

  getBugLeakage: t.procedure
    .input(bugGraphArgsInputParser)
    .query(passInputTo(getBugLeakage)),

  getBugLeakageDataForDrawer: t.procedure
    .input(bugGraphArgsInputParser)
    .query(passInputTo(getBugLeakageDataForDrawer)),

  getFlowEfficiencyGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getFlowEfficiencyGraph)),

  getWorkItemTimeSpent: t.procedure
    .input(timeSpentArgs)
    .query(passInputTo(getWorkItemTimeSpent)),

  getGroupByFieldAndStatesForWorkType: t.procedure
    .input(groupByFieldAndStatesForWorkTypeParser)
    .query(passInputTo(getGroupByFieldAndStatesForWorkType)),
});
