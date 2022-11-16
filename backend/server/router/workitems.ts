import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getWorkItemTypes } from '../../models/work-item-types.js';
import {
  newWorkItemsListForDate, newWorkItemsListForDateInputParser,
  newWorkItemsListForGroup, newWorkItemsListForGroupInputParser,
  newWorkItemsSummary, newWorkItemsSummaryInputParser,
  workItemForTooltip, workItemForTooltipInputParser
} from '../../models/workitems.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsSummaryInputParser)
    .query(passInputTo(newWorkItemsSummary)),

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
    .query(passInputTo(workItemForTooltip))
});
