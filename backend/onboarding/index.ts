import mongoose from 'mongoose';
import { setConfig } from '../config.js';
import type { ParsedConfig } from '../scraper/parse-config.js';
import { getWorkItems } from '../crons/workitems.js';
import { getWorkItemTypes } from '../crons/work-item-types.js';
import { getBuildsAndTimelines } from '../crons/builds.js';

export default async (config: ParsedConfig) => {
  // TODO: This belongs at a higher layer, maybe
  setConfig(config);

  // Disabling floating promise since mongoose takes care of this internally
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mongoose.connect(config.mongoUrl);

  return Promise.all([
    getWorkItems(),
    getWorkItemTypes(),
    getBuildsAndTimelines()
  ]);
};
