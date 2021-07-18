#!/usr/bin/env node
import { join } from 'path';
import yargs from 'yargs';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import getAllTheThings from './scraper/get-all-the-things';
import startServer from './server/express';
import { doesFileExist } from './utils';

// eslint-disable-next-line @typescript-eslint/ban-types
const addConfigOption = (yargs: yargs.Argv<{}>): void => {
  yargs.option('config', {
    alias: 'c',
    default: './config.json',
    describe: 'Path to config file',
    type: 'string'
  });
};

const ensureConfigExists = async (argv: { [argName: string]: unknown }) => {
  const path = join(process.cwd(), argv.config as string);
  if (!await doesFileExist(path)) {
    /* eslint-disable no-console */
    console.log(chalk.red('Couldn\'t find config file!'));
    console.log(chalk.red(`Tried ${path}`));
    /* eslint-enable */
    process.exit(-1);
  }
  return path;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { argv } = yargs(process.argv.slice(2))
  .scriptName('npx project-health-tool')
  .command('scrape', 'Scrape Azure DevOps', addConfigOption, async argv => {
    const configPath = await ensureConfigExists(argv);
    const config = JSON.parse(await fs.readFile(configPath, { encoding: 'utf-8' }));
    await getAllTheThings(config);
  })
  .command('serve', 'Serve the project-health-tool UI', addConfigOption, async argv => {
    const configPath = await ensureConfigExists(argv);
    const config = JSON.parse(await fs.readFile(configPath, { encoding: 'utf-8' }));
    startServer(config);
  });
