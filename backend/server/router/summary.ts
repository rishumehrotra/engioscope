import { passInputTo, t } from './trpc.js';
import {
  getCollectionSummary,
  CollectionNameParser,
  getCollectionCodeQualitySummary,
  getCollectionReleasesSummary,
  getCollectionBuildsSummary,
  getCollectionTestAutomationSummary,
} from '../../models/summary.js';

export default t.router({
  getCollectionSummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionSummary)),

  getCollectionTestAutomationSummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionTestAutomationSummary)),

  getCollectionBuildsSummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionBuildsSummary)),

  getCollectionReleasesSummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionReleasesSummary)),

  getCollectionCodeQualitySummary: t.procedure
    .input(CollectionNameParser)
    .query(passInputTo(getCollectionCodeQualitySummary)),
});
