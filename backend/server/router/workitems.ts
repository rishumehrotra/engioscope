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
  getVelocityWorkItems,
  getCycleTimeWorkItems,
  getChangeLeadTimeWorkItems,
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

  getNewWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getNewWorkItems)),
  getVelocityWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getVelocityWorkItems)),
  getCycleTimeWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getCycleTimeWorkItems)),
  getChangeLeadTimeWorkItems: t.procedure
    .input(graphArgsInputParser)
    .query(passInputTo(getChangeLeadTimeWorkItems)),
});
