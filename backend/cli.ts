#!/usr/bin/env node
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import yargs from 'yargs';
import chalk from 'chalk';
import getAllTheThings from './scraper/get-all-the-things.js';
import startServer from './server/express.js';
import { doesFileExist } from './utils.js';
import parseConfig from './scraper/parse-config.js';
import onboarding from './onboarding.js';

// eslint-disable-next-line @typescript-eslint/ban-types
const addConfigOption = (yargs: yargs.Argv<{}>): void => {
  yargs.option('config', {
    alias: 'c',
    default: './config.json',
    describe: 'Path to config file',
    type: 'string',
  });
};

const ensureConfigExists = async (argv: Record<string, unknown>) => {
  const path = join(process.cwd(), argv.config as string);
  if (!(await doesFileExist(path))) {
    /* eslint-disable no-console */
    console.log(chalk.red("Couldn't find config file!"));
    console.log(chalk.red(`Tried ${path}`));
    /* eslint-enable */
    process.exit(-1);
  }
  return path;
};

const readConfig = async (argv: Record<string, unknown>) => {
  const configPath = await ensureConfigExists(argv);
  return parseConfig(JSON.parse(await fs.readFile(configPath, { encoding: 'utf8' })));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { argv } = yargs(process.argv.slice(2))
  .scriptName('npx engioscope')
  .command('scrape', 'Scrape Azure DevOps', addConfigOption, argv =>
    readConfig(argv).then(getAllTheThings)
  )
  .command('serve', 'Serve the engioscope UI', addConfigOption, argv =>
    readConfig(argv).then(startServer)
  )
  .command('onboard', 'Onboard new projects', addConfigOption, argv =>
    readConfig(argv).then(onboarding)
  );
