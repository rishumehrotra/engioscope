import scrape from '../scraper/get-all-the-things';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json';
import type { Config } from '../scraper/parse-config';

scrape(config as unknown as Config);
