import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getWorkItemTypes } from '../../models/work-item-types.js';
import {
  newWorkitemsListForGroup, newWorkitemsListForGroupInputParser, newWorkItemsSummary, newWorkItemsSummaryInputParser
} from '../../models/workitems.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsSummaryInputParser)
    .query(passInputTo(newWorkItemsSummary)),

  getWorkItemTypes: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getWorkItemTypes)),

  newWorkitemsListForGroup: t.procedure
    .input(newWorkitemsListForGroupInputParser)
    .query(passInputTo(newWorkitemsListForGroup))
});
