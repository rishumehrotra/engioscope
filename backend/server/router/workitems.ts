import { collectionAndProjectInputParser } from '../../models/helpers.js';
import { getWorkItemTypes } from '../../models/work-item-types.js';
import { newWorkItems, newWorkItemsInputParser } from '../../models/workitems.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsInputParser)
    .query(passInputTo(newWorkItems)),
  getWorkItemTypes: t.procedure
    .input(collectionAndProjectInputParser)
    .query(passInputTo(getWorkItemTypes))
});
