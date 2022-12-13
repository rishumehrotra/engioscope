import onboarding from '../onboarding.js';
// Following line ts-ignore'd so that it can work in the CI pipeline
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import config from '../../config.json' assert { type: 'json' };
import type { Config } from '../scraper/parse-config.js';
import parseConfig from '../scraper/parse-config.js';

await onboarding(parseConfig(config as unknown as Config));

// eslint-disable-next-line unicorn/no-process-exit
process.exit();
