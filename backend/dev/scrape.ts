import scrape from '../scraper/get-all-the-things.js';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json' assert { type: 'json' };
import type { Config } from '../scraper/parse-config.js';
import parseConfig from '../scraper/parse-config.js';

await scrape(parseConfig(config as unknown as Config));
