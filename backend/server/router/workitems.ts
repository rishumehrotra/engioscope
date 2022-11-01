import { newWorkItems, newWorkItemsInputParser } from '../../models/workitems.js';
import { passInputTo, t } from './trpc.js';

export default t.router({
  newWorkItems: t.procedure
    .input(newWorkItemsInputParser)
    .query(passInputTo(newWorkItems))
});
