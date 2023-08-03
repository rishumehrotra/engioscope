import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getWorkItemConfig, getWorkItemTypes } from '../../models/work-item-types.js';
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
  getOverviewGraph,
  graphInputParser,
} from '../../models/workitems2.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsSummaryInputParser)
    .query(passInputTo(newWorkItemsSummary)),

  getWorkItemConfig: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getWorkItemConfig)),

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
  getOverviewGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getOverviewGraph)),
  getCycleTimeGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getCycleTimeGraph)),
  getChangeLeadTimeGraph: t.procedure
    .input(graphInputParser)
    .query(passInputTo(getChangeLoadTimeGraph)),
});
