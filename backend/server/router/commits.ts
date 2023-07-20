import {
  devCommitsDetailsInputParser,
  devFilterInputParser,
  devListingInputParser,
  getFilteredDevCount,
  getRepoCommitsDetailsForAuthorEmail,
  getSortedDevListing,
} from '../../models/commits.js';
import { passInputTo, t, memoizeForUI } from './trpc.js';

export default t.router({
  getSortedDevListing: t.procedure
    .input(devListingInputParser)
    .query(passInputTo(memoizeForUI(getSortedDevListing))),

  getFilteredDevCount: t.procedure
    .input(devFilterInputParser)
    .query(passInputTo(getFilteredDevCount)),

  getRepoCommitsDetailsForAuthorEmail: t.procedure
    .input(devCommitsDetailsInputParser)
    .query(passInputTo(getRepoCommitsDetailsForAuthorEmail)),
});
