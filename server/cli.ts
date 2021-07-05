#!/usr/bin/env node

import yargs, { } from 'yargs';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { argv } = yargs(process.argv.slice(2))
  .scriptName('npx project-health-tool')
  .command('scrape', 'Scrape Azure DevOps', argv => {
    console.log(`Scraping ${JSON.stringify(argv)}`);
  })
  .command('serve', 'Serve the project-health-tool UI', argv => {
    console.log(`Serving ${JSON.stringify(argv)}`);
  })
  .option('config', {
    alias: 'c',
    default: './config.js',
    describe: 'Path to config file',
    type: 'string'
  });
