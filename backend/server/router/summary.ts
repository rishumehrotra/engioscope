import { passInputTo, t } from './trpc.js';
import { getCollectionSummary, CollectionNameParser } from '../../models/summary.js';

export default t.router({
  getCollectionSummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionSummary)),
});
