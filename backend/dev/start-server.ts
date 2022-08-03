import startServer from '../server/express.js';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json' assert { type: 'json' };
import type { Config } from '../scraper/parse-config.js';
import parseConfig from '../scraper/parse-config.js';

startServer(parseConfig(config as unknown as Config));
