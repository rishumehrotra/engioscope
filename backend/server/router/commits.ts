import {
  devCommitsDetailsInputParser,
  devFilterInputParser,
  devListingInputParser,
  getFilteredDevCount,
  getRepoCommitsDetails,
  getRepoCommitsDetailsForAuthorEmail,
  getSortedDevListing,
  repoCommitsDetailsInputParser,
} from '../../models/commits.js';
import { passInputTo, t, memoizeForUI } from './trpc.js';

export default t.router({
  getRepoCommitsDetails: t.procedure
    .input(repoCommitsDetailsInputParser)
    .query(passInputTo(getRepoCommitsDetails)),

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
